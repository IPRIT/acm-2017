export default class Disposable {

  dispose() {
    this._deleteObject( this );
  }

  _deleteObject(object) {
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        object[ key ] = null;
        delete object[ key ];
      }
    }
  }
}