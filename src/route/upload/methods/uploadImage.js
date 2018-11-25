import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const fileMoveAsync = promisify( fs.rename );
const fileDeleteAsync = promisify( fs.unlink );

export function uploadImageRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return uploadImage( req );
  }).then(result => res.json(result)).catch(next);
}

export async function uploadImage ({ file }) {
  const tempPath = file.path;
  const imageName = `${Math.random().toString( 16 )}${Math.random().toString( 16 )}`;
  const extName = path.extname( file.originalname );
  const fileFullName = `${imageName}${extName}`;
  const relativePath = `/uploads/images/${fileFullName}`;
  const targetPath = path.join( __dirname, `../../../../app${relativePath}` );

  const extensionsWhitelist = [
    '.png', '.jpg', '.jpeg', '.webp', '.gif',
  ];

  const isAllowedExt = extensionsWhitelist.includes( extName );

  if (isAllowedExt) {
    return fileMoveAsync( tempPath, targetPath ).then(_ => {
      return { link: relativePath }
    });
  } else {
    return fileDeleteAsync( tempPath ).then(_ => {
      throw new HttpError( 'Invalid file format', 403 )
    });
  }
}