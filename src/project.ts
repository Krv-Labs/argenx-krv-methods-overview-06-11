import {makeProject} from '@motion-canvas/core';

import data_ecosystem from './scenes/data_ecosystem?scene';
import methods from './scenes/methods?scene';

export default makeProject({
  scenes: [data_ecosystem, methods],
});
