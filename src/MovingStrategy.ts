import * as THREE from 'three';

export enum GrowDirection {
    U, D, L, R
}
export abstract class PointMover {
    abstract move(point: THREE.Vector3, value: number): void;
}

export abstract class DistanceSelector {
    folderWidth!: number;
    folderHeight!: number;
    fileWidth!: number;
    fileHeight!: number;
    setDistances(folderWidth: number, folderHeight: number, fileWidth: number, fileHeight: number): void {
        this.folderWidth = folderWidth;
        this.folderHeight = folderHeight;
        this.fileWidth = fileWidth;
        this.fileHeight = fileHeight;
    }
    abstract getSiblingDistance(): number;
    abstract getSonDistance(): number;
    abstract getFileDistance(): number;
    abstract getFirstFileDistance(): number;
}
export interface IMovingStrategy {
    setDistances(folderWidth: number, folderHeight: number, fileWidth: number, fileHeight: number): void;
    setGrowingDirections(foldersGrowDirection: GrowDirection, filesGrowDirection: GrowDirection): void
    setFolderGrowDirection(foldersGrowDirection: GrowDirection): void;
    setFileGrowDirection(filesGrowDirection: GrowDirection): void;

    moveSiblingDistance(point: THREE.Vector3, multiplyer: number): void;
    moveSonDistance(point: THREE.Vector3): void;
    moveFileDistance(point: THREE.Vector3, multiplyer: number): void;
    moveFirstFileDistance(point: THREE.Vector3): void;

}
export abstract class BaseMovingStrategy implements IMovingStrategy {
    // GrowDirections
    foldersGrowDirection!: GrowDirection;
    filesGrowDirection!: GrowDirection;
    // Movers
    siblingMover!: PointMover;
    sonMover!: PointMover;
    fileMover!: PointMover;
    // DistanceSelectors
    siblingDistanceSelector!: DistanceSelector;
    sonDistanceSelector!: DistanceSelector;
    fileDistanceSelector!: DistanceSelector;

    setGrowingDirections(foldersGrowDirection: GrowDirection, filesGrowDirection: GrowDirection): void {
        this.foldersGrowDirection = foldersGrowDirection;
        this.filesGrowDirection = filesGrowDirection;
        this.reloadObjects();
    }
    setFolderGrowDirection(foldersGrowDirection: GrowDirection): void {
        this.foldersGrowDirection = foldersGrowDirection;
        this.reloadObjects();
    }
    setFileGrowDirection(filesGrowDirection: GrowDirection): void {
        this.filesGrowDirection = filesGrowDirection;
        this.reloadObjects();
    }
    
    private reloadObjects() {
        switch (this.foldersGrowDirection) {
            case GrowDirection.U:
                this.siblingMover = new YPointMover();
                break;
            case GrowDirection.D:
                this.siblingMover = new InvertedYPointMover();
                break;
            case GrowDirection.L:
                this.siblingMover = new InvertedXPointMover();
                break;
            case GrowDirection.R:
                this.siblingMover = new XPointMover();
                break;
            default:
                break;
        }
        switch (this.filesGrowDirection) {
            case GrowDirection.U:
                this.sonMover = new YPointMover();
                break;
            case GrowDirection.D:
                this.sonMover = new InvertedYPointMover();
                break;
            case GrowDirection.L:
                this.sonMover = new InvertedXPointMover();
                break;
            case GrowDirection.R:
                this.sonMover = new XPointMover();
                break;
            default:
                break;
        }
        switch (this.filesGrowDirection) {
            case GrowDirection.U:
                this.fileMover = new YPointMover();
                break;
            case GrowDirection.D:
                this.fileMover = new InvertedYPointMover();
                break;
            case GrowDirection.L:
                this.fileMover = new InvertedXPointMover();
                break;
            case GrowDirection.R:
                this.fileMover = new XPointMover();
                break;
            default:
                break;
        }

        switch (this.foldersGrowDirection) {
            case GrowDirection.U:
            case GrowDirection.D:
                this.siblingDistanceSelector = new VFolderValueSelector();
                this.sonDistanceSelector = new VFolderValueSelector();
                break;
            case GrowDirection.L:
            case GrowDirection.R:
                this.siblingDistanceSelector = new HFolderValueSelector();
                this.sonDistanceSelector = new HFolderValueSelector();
                break;
            default:
                break;
        }
        switch (this.filesGrowDirection) {
            case GrowDirection.U:
            case GrowDirection.D:
                this.fileDistanceSelector = new VFolderValueSelector();
                break;
            case GrowDirection.L:
            case GrowDirection.R:
                this.fileDistanceSelector = new HFolderValueSelector();
                break;
            default:
                break;
        }
    }

    abstract moveSiblingDistance(point: THREE.Vector3, multiplyer: number): void;
    abstract moveSonDistance(point: THREE.Vector3): void;
    abstract moveFileDistance(point: THREE.Vector3, multiplyer: number): void;
    abstract moveFirstFileDistance(point: THREE.Vector3): void;

    setDistances(folderWidth: number, folderHeight: number, fileWidth: number, fileHeight: number): void {
        this.siblingDistanceSelector.setDistances(folderWidth, folderHeight, fileWidth, fileHeight);
        this.sonDistanceSelector.setDistances(folderWidth, folderHeight, fileWidth, fileHeight);
        this.fileDistanceSelector.setDistances(folderWidth, folderHeight, fileWidth, fileHeight);
    }
}

export class XPointMover extends PointMover {
    move(point: THREE.Vector3, value: number) {
        point.x += value;
    }
}
export class InvertedXPointMover extends PointMover {
    move(point: THREE.Vector3, value: number) {
        point.x -= value;
    }
}

export class YPointMover extends PointMover {
    move(point: THREE.Vector3, value: number) {
        point.y += value;
    }
}
export class InvertedYPointMover extends PointMover {
    move(point: THREE.Vector3, value: number) {
        point.y -= value;
    }
}

export class HFolderValueSelector extends DistanceSelector {
    getSiblingDistance(): number {
        return this.folderWidth;
    }
    getSonDistance(): number {
        return this.folderHeight;
    }
    getFileDistance(): number {
        // return this.fileHeight;
        return this.fileWidth;
    }
    getFirstFileDistance(): number {
        // return this.fileHeight/2+this.folderHeight/2;
        return this.fileWidth/2+this.folderWidth/2;
    }
}
export class VFolderValueSelector extends DistanceSelector {
    getSiblingDistance(): number {
        return this.folderHeight;
    }
    getSonDistance(): number {
        return this.folderWidth;
    }
    getFileDistance(): number {
        // return this.fileWidth;
        return this.fileHeight;
    }
    getFirstFileDistance(): number {
        // return this.fileWidth/2+this.folderWidth/2;
        return this.fileHeight/2+this.folderHeight/2;
    }
}


export class MovingStrategy extends BaseMovingStrategy {
    moveSiblingDistance(point: THREE.Vector3, multiplyer: number = 1): void {
        this.siblingMover.move(point, this.siblingDistanceSelector.getSiblingDistance() * multiplyer);
    }
    moveSonDistance(point: THREE.Vector3): void {
        this.sonMover.move(point, this.sonDistanceSelector.getSonDistance());
    }
    moveFileDistance(point: THREE.Vector3, multiplyer: number): void {
        this.fileMover.move(point, this.fileDistanceSelector.getFileDistance() * multiplyer);
    }
    moveFirstFileDistance(point: THREE.Vector3) {
        this.fileMover.move(point, this.fileDistanceSelector.getFirstFileDistance());

    }
}