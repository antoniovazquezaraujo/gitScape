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
export class TreeNodeManager {
    public createTree(elements: LogTree[]): TreeNode {
        const root = new TreeNode('');

        for (const element of elements) {
            let currentTreeNode = root;
            const segments = element.path!.split('/');

            var segment = segments[segments.length - 1];
            if (!currentTreeNode.children[segment]) {
                currentTreeNode.children[segment] = new TreeNode(segment);
                if (element.type == "blob") {
                    currentTreeNode.children[segment].isFile = true;
                }
            }
            currentTreeNode = currentTreeNode.children[segment];
        }
        return root;
    }
}