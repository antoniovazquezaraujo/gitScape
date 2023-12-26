import { TreeNodeManager, TreeNode } from './NodeManager'
import { Octokit } from '@octokit/rest';

// const octokit = new Octokit();

const octokit = new Octokit({
    auth: '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', // Reemplaza esto con tu token de GitHub
});

const owner = 'antoniovazquezaraujo';
const repo = 'LeTrain';

export default class LogManager {
 
    public getCommits() {
        return octokit.repos
            .listCommits({
                owner,
                repo  
            });
    } 

    public async getTree(ref: string): Promise<TreeNode> {
        const root = new TreeNode('/');
        const { data } =  await octokit.git.getTree({
            owner,
            repo,
            tree_sha: ref,
            recursive: '1',
        });

        data.tree.forEach((item: any) => {
            let currentNode = root;
            const pathParts = item.path.split('/');
            pathParts.forEach((part: string, index: number) => {
                if (!currentNode.children[part]) {
                    currentNode.children[part] = new TreeNode(part);
                }
                currentNode = currentNode.children[part];
                if (index === pathParts.length - 1 && item.type === 'blob') {
                    currentNode.isFile = true;
                }
            });
        });

        return root;
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
