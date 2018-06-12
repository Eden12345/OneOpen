var camera, scene, renderer, controls;
var water;
var objects = [];
var raycaster;
var sphere;
var directions = document.getElementById( 'directions' );
var startScreen = document.getElementById( 'start-screen' );
var startButton = document.getElementById( 'start-button' );
var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

// Use logic from Three.js repo for browser pointer-lock
if ( havePointerLock ) {
  var element = document.body;
  var pointerlockchange = function ( event ) {
    if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
      controlsEnabled = true;
      controls.enabled = true;
      startScreen.style.display = 'none';
      directions.style.display = 'flex';
      startButton.innerHTML = 'Click Here to Continue';
    } else {
      controls.enabled = false;
      startScreen.style.display = 'flex';
      startButton.style.display = '';
      directions.style.display = 'none';
    }
  };
  var pointerlockerror = function ( event ) {
    startButton.style.display = '';
  };
  // Hook pointer lock state change events
  document.addEventListener( 'pointerlockchange', pointerlockchange, false );
  document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
  document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
  document.addEventListener( 'pointerlockerror', pointerlockerror, false );
  document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
  document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
  startButton.addEventListener( 'click', function ( event ) {
    startButton.style.display = 'none';
    // Ask the browser to lock the pointer
    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
    element.requestPointerLock();
  }, false );
} else {
  startButton.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
}

var controlsEnabled = false;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;
var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();

init();
animate();

function init() {
  //Initiate camera with farther field of view to avoid skybox tearing
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 4200 );
  scene = new THREE.Scene();

  // Create skybox using sky module from water example
  // (commented out due to compatibility issues)
  //
  // scene.background = new THREE.Color( 0x944dff );
  // var sky = new THREE.Sky();
  // sky.scale.setScalar( 10000 );
  // scene.add( sky );
  // var uniforms = sky.material.uniforms;
  // uniforms.turbidity.value = 10;
  // uniforms.rayleigh.value = 2;
  // uniforms.luminance.value = 10;
  // uniforms.mieCoefficient.value = 0.005;
  // uniforms.mieDirectionalG.value = 0.8;

  // Create traditional skybox and load custom skybox textures
  var faceArray = [];
  faceArray.push(new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader().load('./textures/Custom_skybox/side1.png') }));
  faceArray.push(new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader().load('./textures/Custom_skybox/side2.png' ) }));
  faceArray.push(new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader().load('./textures/Custom_skybox/ceil.png' ) }));
  faceArray.push(new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader().load('./textures/Custom_skybox/floor.png' ) }));
  faceArray.push(new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader().load('./textures/Custom_skybox/side3.png' ) }));
  faceArray.push(new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader().load('./textures/Custom_skybox/side4.png' ) }));
  for (var i = 0; i < 6; i++) {
    faceArray[i].side = THREE.BackSide;
  }
  var skyboxGeometry = new THREE.CubeGeometry( 3000, 3000, 3000, 1, 1, 1 );
  var skybox = new THREE.Mesh( skyboxGeometry, faceArray );
  skybox.position.z = -1000;
  // skybox.position.y = ;
  scene.add( skybox );


  // Removing fog (from original)
  // scene.fog = new THREE.Fog( 0xffffff, 0, 1750 );

  // Add lighting
  var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
  light.position.set( 0.5, 1, 0.75 );
  scene.add( light );

  light2 = new THREE.DirectionalLight( 0xffffff, 0.6 );
  scene.add( light2 );
  light2.target.position.set(0, 0, -1);
  scene.add( light2.target );

  light3 = new THREE.DirectionalLight( 0xffffff, 0.6 );
  scene.add( light3 );
  light3.target.position.set(1, -1, 3);
  scene.add( light3.target );


  // Add crystal floor using water module
  var floorGeometry = new THREE.PlaneBufferGeometry( 3100, 3100 );
    crystal = new THREE.Water(
      floorGeometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( './textures/resized_crystal.jpg', function ( texture ) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        alpha: 1.0,
        sunDirection: light2.position.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale:  0,
        size: 1,
        fog: scene.fog !== undefined
      }
    );
  crystal.rotation.x = - Math.PI / 2;
  crystal.position.z = -1000;
  scene.add( crystal );


  // Use keymapping from Three.js repo
  controls = new THREE.PointerLockControls( camera );
  scene.add( controls.getObject() );
  var onKeyDown = function ( event ) {
    switch ( event.keyCode ) {
      case 38: // up
      case 87: // w
        moveForward = true;
        break;
      case 37: // left
      case 65: // a
        moveLeft = true; break;
      case 40: // down
      case 83: // s
        moveBackward = true;
        break;
      case 39: // right
      case 68: // d
        moveRight = true;
        break;
      case 32: // space
        if ( canJump === true ) velocity.y += 350;
        canJump = false;
        break;
    }
  };
  var onKeyUp = function ( event ) {
    switch( event.keyCode ) {
      case 38: // up
      case 87: // w
        moveForward = false;
        break;
      case 37: // left
      case 65: // a
        moveLeft = false;
        break;
      case 40: // down
      case 83: // s
        moveBackward = false;
        break;
      case 39: // right
      case 68: // d
        moveRight = false;
        break;
    }
  };
  document.addEventListener( 'keydown', onKeyDown, false );
  document.addEventListener( 'keyup', onKeyUp, false );
  raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

  // boxes
  var boxGeometry = new THREE.BoxBufferGeometry( 20, 20, 20 );

  // Array of box positions
  var boxPositions = [

    // Old stair coordinates (from original)
    // [20, 10, -380],
    // [20, -10, -380],
    // [20, 10, -400],
    // [20, -10, -400],
    //
    // [40, 10, -440],
    // [40, -10, -440],
    // [40, 10, -460],
    // [40, -10, -460],
    //
    // [60, 10, -500],
    // [60, -10, -500],
    // [60, 10, -520],
    // [60, -10, -520]

    // Only sets initial stair jump platforms
    [20, 10, -440],
    [20, -10, -440],
    [20, 10, -460],
    [20, -10, -460],

    [40, 10, -480],
    [40, -10, -480],
    [40, 10, -500],
    [40, -10, -500],

    [60, 10, -520],
    [60, -10, -520],
    [60, 10, -540],
    [60, -10, -540]
  ]

  function addToBoxPos(boxPos) {

    // Center platform
    for (var x = -70; x <= 70; x += 20) {
      for (var z = -560; z >= -700; z -= 20) {
        boxPos.push([80, x, z]);
      }
    }

    // Rings
    for (var x = -140; x <= 140; x += 20) {
      boxPos.push([130, x, -750]);
      boxPos.push([130, x, -770]);
    }

    for (var x = -210; x <= 210; x += 20) {
      boxPos.push([180, x, -820]);
      boxPos.push([180, x, -840]);
    }

    for (var x = -280; x <= 280; x += 20) {
      boxPos.push([240, x, -890]);
      boxPos.push([240, x, -910]);
    }

    for (var x = -350; x <= 350; x += 20) {
      boxPos.push([300, x, -960]);
      boxPos.push([300, x, -980]);
    }

    for (var z = -560; z >= -740; z -= 20) {
      boxPos.push([130, -120, z]);
      boxPos.push([130, -140, z]);
      boxPos.push([130, 120, z]);
      boxPos.push([130, 140, z]);
    }

    for (var z = -560; z >= -810; z -= 20) {
      boxPos.push([180, -190, z]);
      boxPos.push([180, -210, z]);
      boxPos.push([180, 190, z]);
      boxPos.push([180, 210, z]);
    }

    for (var z = -560; z >= -880; z -= 20) {
      boxPos.push([240, -260, z]);
      boxPos.push([240, -280, z]);
      boxPos.push([240, 260, z]);
      boxPos.push([240, 280, z]);
    }

    for (var z = -560; z >= -950; z -= 20) {
      boxPos.push([300, -330, z]);
      boxPos.push([300, -350, z]);
      boxPos.push([300, 330, z]);
      boxPos.push([300, 350, z]);
    }

  }
  addToBoxPos(boxPositions);

  // Texture option
  var marbleTexture = new THREE.TextureLoader().load('./textures/WM_Marble-125_1024.png');

  // Set boxes
  for ( var i = 0; i < boxPositions.length; i ++ ) {

    var boxMaterial = new THREE.MeshPhysicalMaterial( {
      //Color was 0xe6ffff (from original)
      color: 0xffdd99
    });

    var box = new THREE.Mesh( boxGeometry, boxMaterial );
    box.position.y = boxPositions[i][0];
    box.position.x = boxPositions[i][1];
    box.position.z = boxPositions[i][2];
    scene.add( box );
    objects.push( box );
  }



  // Randomized box positions
  for ( var i = 0; i < 1500; i ++ ) {

    var boxMaterial = new THREE.MeshPhysicalMaterial( {
      // map: marbleTexture,
      //Color was 0xffe6ff (from original)
      color: 0xffdd99
    });
    var box = new THREE.Mesh( boxGeometry, boxMaterial );

    box.position.y = Math.floor( Math.random() * 20 ) * 40 + 300;
    box.position.x = Math.floor( Math.random() * 20 - 10 ) * 40;
    box.position.z = Math.floor( Math.random() * 20 - 10 ) * 20 - 1200;

    scene.add( box );
    objects.push( box );
  }



  // Add SPHERE OF POWER
  var sphereGeometry = new THREE.SphereBufferGeometry( 200, 32, 32 );
  var sphereMaterial = new THREE.MeshPhysicalMaterial( {
    map: marbleTexture,
    // color: 0xffe6ff (from original)
  });
  sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
  sphere.position.y = 600;
  sphere.position.x = 0;
  sphere.position.z = -640;
  scene.add( sphere );



  // Add doc to renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );
}

// Handle window resizing
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  requestAnimationFrame( animate );

  // Use following logic from Three.js repo for collisions and movement
  if ( controlsEnabled === true ) {
    raycaster.ray.origin.copy( controls.getObject().position );
    raycaster.ray.origin.y -= 10;
    var intersections = raycaster.intersectObjects( objects );
    var onObject = intersections.length > 0;
    var time = performance.now();
    var delta = ( time - prevTime ) / 1000;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * 75.0 * delta; // 100.0 = mass
    direction.z = Number( moveForward ) - Number( moveBackward );
    direction.x = Number( moveLeft ) - Number( moveRight );
    direction.normalize(); // this ensures consistent movements in all directions
    if ( moveForward || moveBackward ) velocity.z -= direction.z * 700.0 * delta;
    if ( moveLeft || moveRight ) velocity.x -= direction.x * 700.0 * delta;
    if ( onObject === true ) {
      velocity.y = Math.max( 0, velocity.y );
      canJump = true;
    }
    controls.getObject().translateX( velocity.x * delta );
    controls.getObject().translateY( velocity.y * delta );
    controls.getObject().translateZ( velocity.z * delta );
    if ( controls.getObject().position.y < 10 ) {
      velocity.y = 0;
      controls.getObject().position.y = 10;
      canJump = true;
    }
    prevTime = time;
  }
  render();
}

function sphereLoop () {
  sphere.rotation.y += 0.003;

  requestAnimationFrame(sphereLoop);
}

sphereLoop();

function render () {

  var time = performance.now() * 0.001;

  crystal.material.uniforms.time.value += 1.0 / 60.0;

  renderer.render( scene, camera );
}
