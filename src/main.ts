import './App.css'
import './cubedb-premium/premium.css';
import App from './App.svelte'
import { DataService } from '@stores/data.service';

DataService.getInstance();

const app = new App({
  target: document.getElementById('app') || document.body
})

export default app
