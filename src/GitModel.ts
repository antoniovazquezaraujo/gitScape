import { Octokit } from '@octokit/rest';


const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
   
const octokit = new Octokit({
    auth: githubToken, 
});

const owner = 'antoniovazquezaraujo';
const repo = 'LeTrain';

export class TreeNode {
  name: string;
  children: { [key: string]: TreeNode };
  isFile: boolean;

  constructor(name: string) {
      this.name = name;
      this.children = {};
      this.isFile = false;
  } 
}
interface LogTree {
  path?: string | undefined;
  mode?: string | undefined;
  type?: string | undefined;
  sha?: string | undefined;
  size?: number | undefined;
  url?: string | undefined;
}

export class Directory {
  name: string;
  parent: Directory | null;
  subdirectories: { [key: string]: Directory };
  files: string[];

  constructor(name: string, parent: Directory | null = null) {
      this.name = name;
      this.parent = parent;
      this.subdirectories = {};
      this.files = [];
  }

  getPath(): string {
      if (this.parent === null || this.parent.name === '') {
          return this.name;
      } else {
          return `${this.parent.getPath()}/${this.name}`;
      }
  }
}

export default class GitModel {
 
    public getCommits() {
        return octokit.repos
            .listCommits({
                owner,
                repo  
            });
    } 

    public getDirectory(treeNode: TreeNode):Directory{
      return this.createDirectory(treeNode, null);
    }
    public createDirectory(node: TreeNode, parent: Directory | null = null): Directory {
      const directory = new Directory(node.name, parent);
  
      for (let key in node.children) {
          const childNode = node.children[key];
          if (childNode.isFile) {
              directory.files.push(childNode.name);
          } else {
              const subdirectory = this.createDirectory(childNode, directory);
              directory.subdirectories[subdirectory.name] = subdirectory;
          }
      }  
      return directory;
  }
    public async getTree(ref: string): Promise<TreeNode> {
        const root = new TreeNode('');
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

    
    public printTree(node: TreeNode, prefix: number): void {
      
      prefix++
      if (!node.isFile) {
        console.log('  '.repeat(prefix) + "[" + node.name + "]");
      } else {
        console.log('  '.repeat(prefix) + node.name);
      }
      for (const child in node.children) {
        this.printTree(node.children[child], prefix);
      }
    }
    
  
  public async showData() {
    const logManager = new GitModel();
  
    logManager.getCommits().then(commit => {
      commit.data.forEach(element => {
        var commitInfo: string = "\n------------------COMMIT-------------------------\n";
        commitInfo = commitInfo + "Author: " + element.author?.login + "\n";
        commitInfo = commitInfo + "\nMessage:" + element.commit.message.split("\n")[0] + "\n";
        logManager.getCommitPullRequests(element.sha).then(allPullRequests => {
          commitInfo = commitInfo + "\nPull requests:\n";
          allPullRequests?.forEach(x => {
            commitInfo = commitInfo + (x.title + "\n");
            commitInfo = commitInfo + ("Date: " + x.merged_at + "\n");
          });
          logManager.getCommitFiles(element.sha).then(allFiles => {
            commitInfo = commitInfo + "\nFiles:\n";
            allFiles?.forEach(file => {
              commitInfo = commitInfo + file.filename + "(["+ file.status +"] +:"+ file.additions + " -:"+ file.deletions + " x:"+ file.changes + ")"+ "\n";
            });
            console.log("\n" + commitInfo + "\n");
          });
        });
      });
    });
  }
}
 