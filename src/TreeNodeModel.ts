export enum EventType {
    RepositoryChange = 'repositoryChange',
    TreeNodeChange = 'treeNodeChange',
    CurrentCommitChange = 'currentCommitChange'
}

export interface TreeNode {
    name: string;
    parent: TreeNodeImpl | null;
    children: { [key: string]: TreeNodeImpl; };
    isFile: boolean;
    visible: boolean;

    find(path: string): TreeNode | null;
    findFirstVisibleParent(path: string): TreeNode;
    getNumVisibleNodes(): number;
    getParent(): TreeNodeImpl | null;
    addTreeNode(treeNode: TreeNodeImpl): void;
    removeTreeNode(treeNode: TreeNodeImpl): void;
    getPath(): string;
    removeByName(name: string): void;
}

export class TreeNodeImpl implements TreeNode {
    name: string;
    parent: TreeNodeImpl | null;
    children: { [key: string]: TreeNodeImpl; };
    isFile: boolean;
    visible: boolean;

    constructor(name: string, isFile: boolean = false, parent: TreeNodeImpl | null = null, children: { [key: string]: TreeNodeImpl; } = {}) {
        this.name = name;
        this.parent = parent;
        this.children = children;
        this.isFile = isFile;
        this.visible = !this.isFile; // Los archivos estarán cerrados por defecto
    }

    find(path: string): TreeNode | null {
        const parts = path.split('/');
        let currentNode: TreeNodeImpl | null = this;
        for (const part of parts) {
            if (part in currentNode.children) {
                currentNode = currentNode.children[part];
            } else {
                return null;
            }
        }
        return currentNode;
    }
    findFirstVisibleParent(path: string): TreeNode {
        const parts = path.split('/');
        let currentNode: TreeNode = this;
        let lastOpenNode = currentNode;
        for (const part of parts) {
            let child = currentNode.children[part];
            if (child != null) {
                if (child.visible && !child.isFile) {
                    currentNode = child;
                } else {
                    return child;
                }
            }
            lastOpenNode = currentNode;
        }
        return currentNode;
    }

    getNumVisibleNodes(): number {
        if (!this.visible) {
            return 1
        };
        let total = 1;
        for (let child of Object.values(this.children)) {
            if (!child.isFile) {
                total += child.getNumVisibleNodes();
            }
        }
        return total;
    }


    public getParent() {
        return this.parent;
    }
    addTreeNode(treeNode: TreeNodeImpl) {
        this.children[treeNode.name] = treeNode;
        treeNode.parent = this;
    }
    removeTreeNode(treeNode: TreeNodeImpl) {
        treeNode.parent = null;
        delete this.children[treeNode.name];
    }

    getPath(): string {
        if (this.parent === null || this.parent.name === '') {
            return this.name;
        } else {
            return `${this.parent.getPath()}/${this.name}`;
        }
    }
    removeByName(name: string) {
        const treeNode = this.children[name];
        if (treeNode) {
            this.removeTreeNode(treeNode);
        }
    }
}

