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
        if (this.parent === null) {
            return this.name;
        } else {
            return `${this.parent.getPath()}/${this.name}`;
        }
    }
}
export class TreeNodeManager {
    // public createTree(elements: LogTree[]): TreeNode {
    //     const root = new TreeNode('');

    //     for (const element of elements) {
    //         let currentTreeNode = root;
    //         const segments = element.path!.split('/');

    //         var segment = segments[segments.length - 1];
    //         if (!currentTreeNode.children[segment]) {
    //             currentTreeNode.children[segment] = new TreeNode(segment);
    //             if (element.type == "blob") {
    //                 currentTreeNode.children[segment].isFile = true;
    //             }
    //         }
    //         currentTreeNode = currentTreeNode.children[segment];
    //     }
    //     return root;
    // }
    // public convertTreeNodeToDirectory(node: TreeNode): Directory {
    //     const files: string[] = [];
    //     const subdirectories: Directory[] = [];

    //     for (let key in node.children) {
    //         const childNode = node.children[key];
    //         if (childNode.isFile) {
    //             files.push(childNode.name);
    //         } else {
    //             subdirectories.push(this.convertTreeNodeToDirectory(childNode));
    //         }
    //     }

    //     return new Directory(node.name, files, subdirectories);
    // }
    public convertTreeNodeToDirectory(node: TreeNode, parent: Directory | null = null): Directory {
        const directory = new Directory(node.name, parent);
    
        for (let key in node.children) {
            const childNode = node.children[key];
            if (childNode.isFile) {
                directory.files.push(childNode.name);
            } else {
                const subdirectory = this.convertTreeNodeToDirectory(childNode, directory);
                directory.subdirectories[subdirectory.name] = subdirectory;
            }
        }
    
        return directory;
    }
}