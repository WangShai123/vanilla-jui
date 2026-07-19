import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock DOM environment for testing
const mockDom = {
  document: {
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      style: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      appendChild: () => {},
      removeChild: () => {},
      setAttribute: () => {},
      removeAttribute: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      focus: () => {},
      checkValidity: () => true,
      reportValidity: () => {},
    }),
    createDocumentFragment: () => ({ append: () => {} }),
    createTextNode: (text) => ({ nodeType: 3, data: text }),
    body: {
      appendChild: () => {},
      style: {},
    },
    activeElement: null,
    contains: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  Node: class Node {},
  HTMLElement: class HTMLElement {},
};

const originalDocument = global.document;
const originalNode = global.Node;
const originalHTMLElement = global.HTMLElement;

beforeEach(() => {
  global.document = mockDom.document;
  global.Node = mockDom.Node;
  global.HTMLElement = mockDom.HTMLElement;
});

afterEach(() => {
  global.document = originalDocument;
  global.Node = originalNode;
  global.HTMLElement = originalHTMLElement;
});

// Now we can import Modal after mocking DOM
import Modal from '../../src/components/modal.js';

describe('Modal Component - Unit Tests', () => {
  let modal;

  beforeEach(() => {
    modal = null;
  });

  afterEach(() => {
    if (modal) {
      try {
        modal.destroy();
      } catch {
        // Ignore destroy errors in tests
      }
    }
  });

  describe('Basic functionality', () => {
    it('should create modal instance with default state', () => {
      modal = new Modal();

      expect(modal).toBeDefined();
      expect(modal.state).toBeDefined();
      expect(modal.state.text.title).toBe('Tip');
      expect(modal.state.text.confirm).toBe('Confirm');
      expect(modal.state.text.cancel).toBe('Cancel');
      expect(modal.state.showCancel).toBe(true);
      expect(modal.state.showClose).toBe(true);
    });

    it('should accept custom state options', () => {
      const onCancel = () => {};
      const customOptions = {
        text: {
          title: 'Custom Title',
          confirm: 'OK',
          cancel: 'Close',
        },
        showCancel: false,
        showClose: false,
        onCancel,
      };

      modal = new Modal(customOptions);

      expect(modal.state.text.title).toBe('Custom Title');
      expect(modal.state.text.confirm).toBe('OK');
      expect(modal.state.text.cancel).toBe('Close');
      expect(modal.state.showCancel).toBe(false);
      expect(modal.state.showClose).toBe(false);
      expect(modal.state.onCancel).toBe(onCancel);
    });

    it('should generate unique id when not provided', () => {
      modal = new Modal();

      expect(modal.state.id).toBeDefined();
      expect(typeof modal.state.id).toBe('string');
      expect(modal.state.id.length).toBeGreaterThan(0);
    });

    it('should use provided id', () => {
      const customId = 'custom-modal-id';
      modal = new Modal({ id: customId });

      expect(modal.state.id).toBe(customId);
    });

    it('should have reactive state store', () => {
      modal = new Modal({ text: { title: 'Test Modal' } });

      expect(modal.state).toBeDefined();
      expect(modal.state.text.title).toBe('Test Modal');
      expect(modal.state.visible).toBe(false);
      expect(modal.state.loading).toBe(false);
    });

    it('should expose initial snapshots and current content', () => {
      const fields = [{ name: 'email', label: 'Email', type: 'email' }];
      modal = new Modal({
        text: { title: 'Snapshot Modal' },
        content: 'Initial content',
        fields,
      });

      expect(modal.state.text.title).toBe('Snapshot Modal');
      expect(modal.state.content).toBe('Initial content');
      expect(modal.state.fields).toEqual(fields);
    });

    it('should create independent instances', () => {
      const modal1 = new Modal();
      const modal2 = new Modal();

      expect(modal1).not.toBe(modal2);
      expect(modal1.state.id).not.toBe(modal2.state.id);

      modal1.destroy();
      modal2.destroy();
    });
  });

  describe('Form mode', () => {
    it('should enter form mode when fields are provided', () => {
      const fields = [
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'password', label: 'Password', type: 'password' },
      ];

      modal = new Modal({ fields });

      expect(modal.isFormMode()).toBe(true);
      expect(Array.isArray(modal.state.fields)).toBe(true);
      expect(modal.state.fields.length).toBe(2);
    });

    it('should exit form mode when fields set to null', () => {
      const fields = [{ name: 'test', label: 'Test' }];

      modal = new Modal({ fields });
      expect(modal.isFormMode()).toBe(true);

      modal.setFields(null);
      expect(modal.isFormMode()).toBe(false);
    });

    it('should reset fields to initial configuration', () => {
      const initialFields = [{ name: 'field1', label: 'Field 1' }];

      modal = new Modal({ fields: initialFields });
      modal.setFields([{ name: 'field2', label: 'Field 2' }]);
      modal.resetFields();

      expect(modal.isFormMode()).toBe(true);
      expect(modal.state.fields.length).toBe(1);
      expect(modal.state.fields[0].name).toBe('field1');
    });
  });

  describe('Content mode', () => {
    it('should update and reset content', () => {
      modal = new Modal({ content: 'Initial content' });

      modal.setContent('Updated content');
      expect(modal.state.content).toBe('Updated content');

      modal.resetContent();
      expect(modal.state.content).toBe('Initial content');
    });
  });

  describe('Update functionality', () => {
    it('should update modal state', () => {
      modal = new Modal({ text: { title: 'Initial Title' } });

      modal.update({ text: { title: 'Updated Title' } });
      expect(modal.state.text.title).toBe('Updated Title');
    });

    it('should update multiple state fields', () => {
      modal = new Modal({
        text: { title: 'Initial', confirm: 'OK' },
        showCancel: true,
      });

      modal.update({
        text: { title: 'Updated', confirm: 'Confirm' },
        showCancel: false,
      });

      expect(modal.state.text.title).toBe('Updated');
      expect(modal.state.text.confirm).toBe('Confirm');
      expect(modal.state.showCancel).toBe(false);
    });

    it('should set a single state field and support chaining', () => {
      modal = new Modal({
        text: { title: 'Initial' },
        showCancel: true,
      });

      const result = modal
        .setState({ text: { title: 'Changed' } })
        .setState({ showCancel: false })
        .setState({ loading: true })
        .setState({ loading: false });

      expect(result).toBe(modal);
      expect(modal.state.text.title).toBe('Changed');
      expect(modal.state.showCancel).toBe(false);
      expect(modal.state.loading).toBe(false);
    });

    it('should validate setState keys and immutable state fields', () => {
      modal = new Modal({ id: 'test-id', lazy: false });

      expect(() => modal.setState({ unknown: true })).toThrow();
      expect(() => modal.setState({ id: 'new-id' })).toThrow();
      expect(() => modal.setState({ lazy: true })).toThrow();
      expect(() => modal.setState({ loading: 'yes' })).toThrow();
    });
  });

  describe('Destroy functionality', () => {
    it('should destroy modal instance', () => {
      modal = new Modal();

      modal.destroy();

      expect(modal.root).toBeNull();
      expect(modal.state).toBeNull();
    });

    it('should make destroyed instances inactive', () => {
      modal = new Modal();
      modal.destroy();

      expect(() => modal.show()).toThrow('destroyed');
      expect(() => modal.setState({ text: { title: 'Changed' } })).toThrow(
        'destroyed'
      );
    });
  });

  describe('Visibility', () => {
    it('should track visible state', () => {
      modal = new Modal();
      expect(modal.state.visible).toBe(false);
    });

    it('should support update with multiple fields', () => {
      modal = new Modal({ content: 'test', fullscreen: false });

      modal.update({ content: 'updated', fullscreen: true, showCancel: false });

      expect(modal.state.content).toBe('updated');
      expect(modal.state.fullscreen).toBe(true);
      expect(modal.state.showCancel).toBe(false);
    });
  });

  describe('Form operations', () => {
    it('should add fields', () => {
      modal = new Modal();

      modal.addFields({ extra: 'data' });
      expect(modal.state.extraData).toEqual({ extra: 'data' });
    });

    it('should reset to initial state', () => {
      const fields = [{ name: 'email', label: 'Email', type: 'email' }];
      modal = new Modal({ content: 'Initial', fields, showCancel: true });

      modal.setState({ showCancel: false });
      expect(modal.state.showCancel).toBe(false);

      modal.reset();
      expect(modal.state.content).toBe('Initial');
      expect(modal.state.fields.length).toBe(1);
      expect(modal.state.showCancel).toBe(true);
    });
  });

  describe('Position and style', () => {
    it('should accept position prop', () => {
      modal = new Modal({ position: 'bottom' });
      expect(modal.state.position).toBe('bottom');
    });

    it('should accept fullscreen prop', () => {
      modal = new Modal({ fullscreen: true });
      expect(modal.state.fullscreen).toBe(true);
    });

    it('should accept style prop', () => {
      modal = new Modal({ style: { color: 'red' } });
      expect(modal.state.style).toEqual({ color: 'red' });
    });
  });
});
