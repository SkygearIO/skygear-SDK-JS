import container from '../index';
import {setStore} from '../store';
import reactNativeStore from './store';

setStore(reactNativeStore);
container._store = reactNativeStore;

export default container;
