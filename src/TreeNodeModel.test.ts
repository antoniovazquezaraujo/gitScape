import { describe, expect, it } from 'vitest';

import { TreeNodeImpl } from './TreeNodeModel';

interface TestTree {
    root: TreeNodeImpl;
    src: TreeNodeImpl;
    components: TreeNodeImpl;
    button: TreeNodeImpl;
    index: TreeNodeImpl;
    readme: TreeNodeImpl;
}

/**
 * Árbol de ejemplo:
 *
 * '' (raíz)
 * ├── src
 * │   ├── components
 * │   │   └── Button.ts
 * │   └── index.ts
 * └── README.md
 */
function buildTree(): TestTree {
    const root = new TreeNodeImpl('');
    const src = new TreeNodeImpl('src');
    const components = new TreeNodeImpl('components');
    const button = new TreeNodeImpl('Button.ts', true);
    const index = new TreeNodeImpl('index.ts', true);
    const readme = new TreeNodeImpl('README.md', true);

    root.addTreeNode(src);
    src.addTreeNode(components);
    components.addTreeNode(button);
    src.addTreeNode(index);
    root.addTreeNode(readme);

    return { root, src, components, button, index, readme };
}

describe('TreeNodeImpl', () => {
    describe('find', () => {
        it('devuelve el nodo correspondiente a una ruta existente', () => {
            // Arrange
            const { root, components, button } = buildTree();

            // Act & Assert
            expect(root.find('src/components')).toBe(components);
            expect(root.find('src/components/Button.ts')).toBe(button);
        });

        it('devuelve null para una ruta inexistente', () => {
            // Arrange
            const { root } = buildTree();

            // Act & Assert
            expect(root.find('src/does-not-exist')).toBeNull();
            expect(root.find('nope')).toBeNull();
        });
    });

    describe('getPath', () => {
        it('compone la ruta completa con la de sus padres', () => {
            // Arrange
            const { button } = buildTree();

            // Act
            const path = button.getPath();

            // Assert
            expect(path).toBe('src/components/Button.ts');
        });

        it('devuelve solo el nombre cuando el nodo no tiene padre', () => {
            // Arrange
            const parent = new TreeNodeImpl('parent');
            const child = new TreeNodeImpl('child', true);
            parent.addTreeNode(child);

            // Act & Assert
            expect(parent.getPath()).toBe('parent');
            expect(child.getPath()).toBe('parent/child');
        });
    });

    describe('addTreeNode', () => {
        it('añade el hijo al padre y establece la referencia inversa', () => {
            // Arrange
            const parent = new TreeNodeImpl('parent');
            const child = new TreeNodeImpl('child', true);

            // Act
            parent.addTreeNode(child);

            // Assert
            expect(parent.children['child']).toBe(child);
            expect(child.getParent()).toBe(parent);
        });
    });

    describe('removeByName', () => {
        it('elimina el hijo y limpia su referencia al padre', () => {
            // Arrange
            const parent = new TreeNodeImpl('parent');
            const child = new TreeNodeImpl('child', true);
            parent.addTreeNode(child);

            // Act
            parent.removeByName('child');

            // Assert
            expect(parent.children['child']).toBeUndefined();
            expect(child.getParent()).toBeNull();
        });

        it('no falla si el hijo no existe', () => {
            // Arrange
            const parent = new TreeNodeImpl('parent');

            // Act & Assert
            expect(() => parent.removeByName('missing')).not.toThrow();
        });
    });

    describe('getNumVisibleNodes', () => {
        it('cuenta solo las carpetas visibles y sus descendientes', () => {
            // Arrange
            const { root } = buildTree();

            // Act
            const numVisibleNodes = root.getNumVisibleNodes();

            // Assert: raíz + src + components; los ficheros no se cuentan
            expect(numVisibleNodes).toBe(3);
        });

        it('cuenta una carpeta contraída como un único nodo y no recorre sus hijos', () => {
            // Arrange
            const { root, src } = buildTree();

            // Act
            src.visible = false;

            // Assert: raíz + src contraída (components deja de contarse)
            expect(root.getNumVisibleNodes()).toBe(2);
        });
    });

    describe('findFirstVisibleParent', () => {
        it('devuelve el propio fichero para una ruta de fichero', () => {
            // Arrange
            const { root, button } = buildTree();

            // Act
            const visibleParent = root.findFirstVisibleParent('src/components/Button.ts');

            // Assert: los ficheros tienen visible = false y son el primer ancestro no desplegable
            expect(visibleParent).toBe(button);
        });

        it('devuelve la carpeta contraída que oculta la ruta', () => {
            // Arrange
            const { root, components } = buildTree();

            // Act
            components.visible = false;

            // Assert
            expect(root.findFirstVisibleParent('src/components/Button.ts')).toBe(components);
        });

        it('devuelve la carpeta contraída de nivel superior si esta oculta toda la ruta', () => {
            // Arrange
            const { root, src } = buildTree();

            // Act
            src.visible = false;

            // Assert
            expect(root.findFirstVisibleParent('src/components/Button.ts')).toBe(src);
        });
    });
});
