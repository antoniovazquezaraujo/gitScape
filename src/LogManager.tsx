import { TreeNodeManager, TreeNode } from './NodeManager'
import { Octokit } from '@octokit/rest';

// const octokit = new Octokit();

const octokit  = new Octokit({
    auth: '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', // Reemplaza esto con tu token de GitHub
});

const owner = 'antoniovazquezaraujo';
const repo = 'LeTrain';

export default class LogManager {

    public getCommits() {
        return octokit.repos
            .listCommits({
                owner,
                repo,
            });
    }

    public async getTree(ref: string){
        try {
            const tree = await octokit.git.getTree({
                owner,
                repo,
                tree_sha: ref,
                recursive: '1',
              });
            return tree.data.tree.map(file => file);
        } catch (error) {
            console.error(error);
        }
    }
    public async getCommitFiles(ref: string) {
        try {
            const commit = await octokit.repos.getCommit({
                owner,
                repo,
                ref,
                // per_page: 2,
            });
            return commit.data.files;
        } catch (error) {
            console.error(error);
        }
    }
    public async getCommitPullRequests(commit_sha: string) {
        try {
            const commit = await octokit.repos.listPullRequestsAssociatedWithCommit({
                owner,
                repo,
                commit_sha
            });
            return commit.data;
        } catch (error) {
            console.error(error);
        }
    }

}
