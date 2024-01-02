import { Octokit } from '@octokit/rest';
import { TreeNode, Directory } from './GitScapeModel';

export default class GitModel {
  githubToken: string;
  octokit: Octokit;
  owner: string;
  repo: string;
  allCommits: any[] = [];

  public constructor() {
    this.githubToken = import.meta.env.VITE_GITHUB_TOKEN;

    this.octokit = new Octokit({
      auth: this.githubToken,
    });
    this.owner = 'antoniovazquezaraujo';
    this.repo = 'LeTrain';
  }

  public async initialize() {
    return this.reloadAllCommits();
  }

  // obtiene todos los commits de un repositorio
  async reloadAllCommits(): Promise<any[]> {
    const perPage = 100; // Máximo permitido por la API de GitHub
    let page = 1;
    this.allCommits = [];

    while (true) {
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        per_page: perPage,
        page: page,
      });

      this.allCommits = this.allCommits.concat(commits);
      if (commits.length < perPage) {
        break;
      }
      page++;
    }
    return this.allCommits;
  }

  // obtiene todos los commits de un repositorio, si ya se han obtenido previamente, los devuelve
  public async getCommits() {
    if (this.allCommits == undefined) {
      await this.reloadAllCommits();
    }
    return this.allCommits;
  }

  // obtiene el primer commit de un repositorio
  getFirstCommit(): any {
    return this.allCommits[this.allCommits.length - 1];
  }

  // obtiene el último commit de un repositorio
  getLastCommit(): any {
    return this.allCommits[0];
  }

  public findPathInTreeNode(path: string, treeNode: TreeNode): TreeNode | null {
    console.log(path);
    const parts = path.split('/');
    console.log(parts);
    let currentNode = treeNode;
    for (const part of parts) {
      if (part in currentNode.children) {
        currentNode = currentNode.children[part];
      } else {
        return null;
      }
    }
    return currentNode;
  }
  // Obtiene una estructura de Directory a partir de un TreeNode
  public getDirectory(treeNode: TreeNode): Directory {
    return this.createDirectory(treeNode, null);
  }

  // Crea una estructura de Directory a partir de un TreeNode de forma recursiva
  public createDirectory(node: TreeNode, parent: Directory | null = null): Directory {
    const directory = new Directory(node.name, parent);

    for (let key in node.children) {
      const childNode = node.children[key];
      if (childNode.isFile) {
        directory.files.push(childNode.name);
      } else {
        const subdirectory = this.createDirectory(childNode, directory);
        directory.subdirectories.push(subdirectory);
      }
    }
    return directory;
  }

  // Obtiene un TreeNode a partir de un commit
  public async getTree(ref: string): Promise<TreeNode> {
    const root = new TreeNode('');
    const { data } = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
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

  // Obtiene lof ficheros afectados por un commit
  public async getCommitFiles(ref: string) {
    try {
      const commit = await this.octokit.repos.getCommit({
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
      const commit = await this.octokit.repos.listPullRequestsAssociatedWithCommit({
        owner: this.owner,
        repo: this.repo,
        commit_sha
      });
      return commit.data;
    } catch (error) {
      console.error(error);
    }
  }


  public async showData() {
    this.getCommits().then(commit => {
      commit.forEach(element => {
        var commitInfo: string = "\n------------------COMMIT-------------------------\n";
        commitInfo = commitInfo + "Author: " + element.author?.login + "\n";
        commitInfo = commitInfo + "\nMessage:" + element.commit.message.split("\n")[0] + "\n";
        this.getCommitPullRequests(element.sha).then(allPullRequests => {
          commitInfo = commitInfo + "\nPull requests:\n";
          allPullRequests?.forEach(x => {
            commitInfo = commitInfo + (x.title + "\n");
            commitInfo = commitInfo + ("Date: " + x.merged_at + "\n");
          });
          this.getCommitFiles(element.sha).then(allFiles => {
            commitInfo = commitInfo + "\nFiles:\n";
            allFiles?.forEach(file => {
              commitInfo = commitInfo + file.filename + "([" + file.status + "] +:" + file.additions + " -:" + file.deletions + " x:" + file.changes + ")" + "\n";
            });
            console.log("\n" + commitInfo + "\n");
          });
        });
      });
    });
  }
}
