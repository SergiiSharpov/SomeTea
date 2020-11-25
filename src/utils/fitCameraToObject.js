import {Box3, Vector3} from 'three';

export const fitCameraToObject = ( camera, object, offset, controls ) => {

  let currentOffset = offset || 1.25;

  const boundingBox = new Box3();

  // get bounding box of object - this will be used to setup controls and camera
  boundingBox.setFromObject( object );

  console.log(boundingBox)

  const center = new Vector3();
  const size = new Vector3();
  
  boundingBox.getCenter(center);
  boundingBox.getSize(size);

  // get the max side of the bounding box (fits to width OR height as needed )
  const maxDim = Math.max( size.x, size.y, size.z );
  const fov = camera.fov * ( Math.PI / 180 );
  let cameraZ = Math.abs( maxDim / 4 * Math.tan( fov * 2 ) );

  cameraZ *= currentOffset; // zoom out a little so that objects don't fill the screen

  camera.position.z = cameraZ;
  camera.position.y = center.y + size.y * 0.25;

  const minZ = boundingBox.min.z;
  const cameraToFarEdge = ( minZ < 0 ) ? -minZ + cameraZ : cameraZ - minZ;

  camera.far = cameraToFarEdge * 3;
  camera.updateProjectionMatrix();

  console.log(camera.far, camera.near)

  if ( controls ) {

    // set camera to rotate around center of loaded object
    controls.target = center;

    // prevent camera from zooming out far enough to create far plane cutoff
    controls.maxDistance = cameraToFarEdge * 2;

    controls.saveState();
    controls.update();

  } else {

      camera.lookAt( center )

 }
}