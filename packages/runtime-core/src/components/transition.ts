import { getCurrentInstance } from '../component';
import { h } from '../h';

export function resolveTransitionProps(props) {
  const {
    name = 'v',
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onEnter = () => {},
    onBeforeEnter = () => {},
    onLeave = () => {},
    ...rest
  } = props;

  return {
    ...rest,
    beforeEnter(el: HTMLElement) {
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
      onBeforeEnter(el);
    },
    enter(el: HTMLElement) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.remove(enterFromClass);
          el.classList.add(enterToClass);
        });
      });

      const done = () => {
        el.classList.remove(enterToClass);
        el.classList.remove(enterActiveClass);
      };

      onEnter(el, done);

      if (!onEnter || onEnter.length < 2) {
        el.addEventListener('transitionend', done, { once: true });
      }
    },
    leave(el: HTMLElement, remove: () => void) {
      el.classList.add(leaveFromClass);
      el.classList.add(leaveActiveClass);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.remove(leaveFromClass);
          el.classList.add(leaveToClass);
        });
      });

      const done = () => {
        el.classList.remove(leaveToClass);
        el.classList.remove(leaveActiveClass);
        remove();
      };

      onLeave(el, done);

      if (!onLeave || onLeave.length < 2) {
        el.addEventListener('transitionend', done, { once: true });
      }
    },
  };
}

export function Transition(props, { slots }) {
  return h(BaseTransition, resolveTransitionProps(props), slots);
}

const BaseTransition = {
  props: ['enter', 'leave', 'beforeEnter', 'appear'],
  setup(props, { slots }) {
    const vm = getCurrentInstance();

    return () => {
      const vnode = slots.default();
      if (!vnode) return vnode;

      if (props.appear || vm.isMounted) {
        vnode.transition = props;
      } else {
        vnode.transition = {
          beforeEnter: () => {},
          enter: () => {},
          leave: props.leave,
        };
      }

      return vnode;
    };
  },
};
