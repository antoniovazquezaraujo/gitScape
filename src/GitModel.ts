import { Octokit } from 'octokit';
export interface GitModel {
    initialize(): void;
    setCommitIndex(index: number): void;
    getCommitIndex(): number;
    getCommit(index: number): any;
    getCommitIndex(): number;
    getFirstCommit(): any;
    getLastCommit(): any;
    getCurrentCommit(): any;
    getPreviousCommit(): any;
    getCommitCount(): number;
    getCurrentCommitDate(): Date;
    getCommitFiles(ref: string): Promise<any>;
    getFileInfo(file: any): any;
    getPullRequest(number: number): any;
    getPullRequestForCommit(commitSha: string): any;
    getTreeAtCommit(ref: string): Promise<any>;
    reloadAllRepositoryCommits(): Promise<void>;
    getCommitPullRequests(commit_sha: string): any;
    getAllPullRequests(): Promise<any>;
    getCommitsFromUrl(url: string): Promise<any>;
    getAllCommits(): Promise<any>;
}
export class GitModelImpl implements GitModel {
    githubToken!: string;
    octokit!: Octokit;
    owner!: string;
    repo!: string;
    allCommits: any[] = [];
    allPullRequests: any[];
    pullRequestCommits: Map<number, any[]>;
    commitToPullRequest: Map<string, any>;
    commitIndex: number = 0;

    constructor() {
        this.allPullRequests = [];
        this.pullRequestCommits = new Map();
        this.commitToPullRequest = new Map();
    }

    public async initialize() {
        this.createOctokit();
        await this.reloadAllRepositoryCommits();
        await this.initializePullRequests();
        this.setCommitIndex(0);
    }
    async initializePullRequests() {
        try {
            this.allPullRequests = await this.getAllPullRequests();

            // Get the commits of each pull request
            for (const pr of this.allPullRequests) {
                const commits = await this.octokit.paginate(this.octokit.rest.pulls.listCommits.endpoint.merge({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: pr.number,
                    per_page: 100,
                }));

                // Store the commits in the map
                this.pullRequestCommits.set(pr.number, commits);

                // Link each commit to its pull request
                let commit: any = {};
                for (commit of commits) {
                    this.commitToPullRequest.set(commit.sha, pr);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    public getPullRequest(number: number) {
        return this.allPullRequests[number];
    }
    public getPullRequestForCommit(commitSha: string): any {
        return this.commitToPullRequest.get(commitSha);
    }
    public createOctokit(): void {
        this.githubToken = import.meta.env.VITE_GITHUB_TOKEN;
        this.octokit = new Octokit({
            auth: this.githubToken,
        });

        this.owner = 'antoniovazquezaraujo';
        this.repo = 'gitScape-test';
    }

    public setCommitIndex(index: number) {
        this.commitIndex = index;
    }
    public getCommitIndex(): number {
        return this.commitIndex;
    }

    public getCommit(index: number) {
        return this.allCommits[index];
    }
    public getFirstCommit() {
        return this.allCommits[0];
    }
    public getLastCommit() {
        return this.allCommits[this.allCommits.length - 1];
    }
    public getCurrentCommit() {
        return this.allCommits[this.commitIndex];
    }
    public getPreviousCommit() {
        return this.allCommits[this.commitIndex - 1];
    }
    public getCommitCount(): number {
        return this.allCommits.length;
    }
    public getCurrentCommitDate(): Date {
        return new Date(this.allCommits[this.commitIndex].commit.author.date);
    }
    public async getFileInfo(filename: string): Promise<any> {
        const files = await this.getCommitFiles(this.getCurrentCommit())
        const file = await files.find((f: any) => f.filename === filename);
        if (file) {
            return file;
        }
        return null;
    }
    public async reloadAllRepositoryCommits(): Promise<void> {
        const perPage = 10; // Máximo permitido por la API de GitHub
        let page = 0;
        this.allCommits = [];

        while (true) {
            const { data: commits } = await this.octokit.rest.repos.listCommits({
                owner: this.owner,
                repo: this.repo,
                per_page: perPage,
                page: page,
                sha: 'develop'
            });

            this.allCommits = this.allCommits.concat(commits);
            if (commits.length < perPage) {
                break;
            }
            page++;
        }
        this.allCommits.reverse();
    }

    public async getAllCommits() {
        return this.allCommits;
    }

    public async getTreeAtCommit(ref: string): Promise<any> {
        const { data } = await this.octokit.rest.git.getTree({
            owner: this.owner,
            repo: this.repo,
            tree_sha: ref,
            recursive: '1',
        });
        return data;
    }


    // Obtiene lof ficheros afectados por un commit
    public async getCommitFiles(ref: string): Promise<any> {
        try {
            const commit = await this.octokit.rest.repos.getCommit({
                owner: this.owner,
                repo: this.repo,
                ref,
            });
            return commit.data.files;
        } catch (error) {
            console.error(error);
        }
    }

    // Obtiene los pull requests asociados a un commit
    public async getCommitPullRequests(commit_sha: string) {
        try {
            const commit = await this.octokit.rest.repos.listPullRequestsAssociatedWithCommit({
                owner: this.owner,
                repo: this.repo,
                commit_sha
            });
            return commit.data;
        } catch (error) {
            console.error(error);
        }
    }

    async getAllPullRequests(): Promise<any> {
        const options = this.octokit.rest.pulls.list.endpoint.merge({
            owner: this.owner,
            repo: this.repo,
            state: 'all',
            per_page: 100, // maximum amount of results per page
        });
        return await this.octokit.paginate(options);
    }

    public async getCommitsFromUrl(url: string): Promise<any> {
        try {
            const { data: commits } = await this.octokit.request('GET ' + url);
            return commits;
        } catch (error) {
            console.error(error);
        }
    }

}