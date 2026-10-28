import * as migration_20260929_124948_inicial from './20260929_124948_inicial';
import * as migration_20260929_143154_favicon from './20260929_143154_favicon';
import * as migration_20260929_193113_idiomas_contenido from './20260929_193113_idiomas_contenido';
import * as migration_20260929_201328_blog from './20260929_201328_blog';
import * as migration_20260929_221042_blog_autores from './20260929_221042_blog_autores';
import * as migration_20261028_000935_video_entrada from './20261028_000935_video_entrada';

export const migrations = [
  {
    up: migration_20260929_124948_inicial.up,
    down: migration_20260929_124948_inicial.down,
    name: '20260929_124948_inicial',
  },
  {
    up: migration_20260929_143154_favicon.up,
    down: migration_20260929_143154_favicon.down,
    name: '20260929_143154_favicon',
  },
  {
    up: migration_20260929_193113_idiomas_contenido.up,
    down: migration_20260929_193113_idiomas_contenido.down,
    name: '20260929_193113_idiomas_contenido',
  },
  {
    up: migration_20260929_201328_blog.up,
    down: migration_20260929_201328_blog.down,
    name: '20260929_201328_blog',
  },
  {
    up: migration_20260929_221042_blog_autores.up,
    down: migration_20260929_221042_blog_autores.down,
    name: '20260929_221042_blog_autores',
  },
  {
    up: migration_20261028_000935_video_entrada.up,
    down: migration_20261028_000935_video_entrada.down,
    name: '20261028_000935_video_entrada'
  },
];
