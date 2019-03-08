import container from '../index';
import {setStore} from '../store';
import reactNativeStore from './store';
import {DatabaseContainer} from '../database';

setStore(reactNativeStore);
container._store = reactNativeStore;
// Cache of DatabaseContainer will use the container store
// So we have to recreate the _db after the store is changed
container._db = new DatabaseContainer(container);

export default container;
