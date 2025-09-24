// import { h } from 'vue';
import { h } from '../dist/vue.esm.js';

export default {
  props: ['msg'],
  setup(props) {
    return () => h('div', props.msg || 'hello world');
  },
};
