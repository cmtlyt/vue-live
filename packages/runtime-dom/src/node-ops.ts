/**
 * 封装 dom 节点操作 api
 */
export const nodeOps = {
  createElement(type) {
    return document.createElement(type);
  },
  setElementText(node, text) {
    node.textContent = text;
  },
  insert(el, parent, anchor) {
    parent.insertBefore(el, anchor);
  },
  remove(el) {
    const parentNode = (el || {}).parentNode;
    if (parentNode) {
      parentNode.removeChild(el);
    }
  },
  createText(text) {
    return document.createTextNode(text);
  },
  setText(node, text) {
    return (node.nodeValue = text);
  },
  parentNode(el) {
    return el.parentNode;
  },
  nextSibling(el) {
    return el.nextSibling;
  },
  querySelector(selector) {
    return document.querySelector(selector);
  },
};
