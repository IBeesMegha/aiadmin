declare const __non_webpack_require__: any;

const nodeRequire = typeof __non_webpack_require__ !== 'undefined'
  ? __non_webpack_require__
  : (id: string) => require(id);

export default nodeRequire;
