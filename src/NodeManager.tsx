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

export class TreeNodeManager {
    public createTree(elements: any): TreeNode {
        const root = new TreeNode('');

        for (const element of elements) {
            let currentTreeNode = root;
            const segments = element.path.split('/');

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

