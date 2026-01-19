import fs from 'fs';
import path from 'path';

export class Cache {
  constructor(private dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  pathFor(id: string) {
    return path.join(this.dir, `${id}.opus`);
  }

  has(id: string) {
    return fs.existsSync(this.pathFor(id));
  }
}
