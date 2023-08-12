import { DataService } from "./data.service";
import { NotificationService } from "./notification.service";

let notService = NotificationService.getInstance();

export class UpdateService {
  static checkForUpdates() {
    return fetch('https://api.github.com/repos/isaacvr/cubedb-svelte/releases/latest')
      .then(res => res.json())
      .then(res => {
        console.log('TAG: ', res.tag_name);
        return VERSION == res.tag_name.slice(1);
      });
  }

  static update(): Promise<boolean> {
    return new Promise((res, rej) => {
      let dataService = DataService.getInstance();

      let sub = dataService.anySub.subscribe((v) => {
        if ( !v ) return;

        switch( v.type ) {
          case 'update': {
            sub();
            res(v.data);
            break;
          }
          case 'update-error': {
            sub();
            rej();
            break;
          }
        }
      });

      dataService.update();

    });
  }
}
