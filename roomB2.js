// Room B2 - Extension of the B Gallery Series
// - Cloned from roomB.js with different metal and copper textures
// - Uses metal4 for walls
// - Uses copper2, copper3, copper4 for decorations
// - Loads 60 NFTs from RoomB2 folder (PNG format)
// - Features floor portal back to Room 0
// - Same room dimensions, special jumping physics (high jump, slow fall)

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadTextureWithDiagnostics, logTextureLoadingSummary, getTextureUrl, getRoomBNftUrl } from './src/core/asset-utils.js';
import { ProgressiveTextureLoader } from './src/core/progressive-loader.js';

// ----------------------------------------------------------------------
// Scene Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5a7080); // Even darker blue-gray for Room B2

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Set rotation order to YXZ to prevent gimbal lock with PointerLockControls
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Constants for room dimensions and player settings
const roomWidth = 120;
const roomLength = 120;
const roomHeight = 60;
const groundLevel = 0;
const eyeHeight = 16.0; // Doubled for better viewing angle
let isJumping = false;
let jumpVelocity = 0;
const gravity = -10; // Slow fall gravity
const initialJumpVelocity = 35; // High jump to reach ceiling
const hoverZoneHeight = roomHeight - 3; // Near-ceiling hover zone (57 units)
const hoverGravity = -2; // Very slow fall in hover zone
const bounceCoefficient = 0.3; // Ceiling bounce
const speed = 60.0;

// Movement and controls
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let prevTime = performance.now();
const clock = new THREE.Clock();

// Global reference to the loaded model
let loadedModel = null;
let modelLoaded = false;
let modelLoadingError = false;

// Global reference for the mirror ceiling
let mirrorCubeCamera = null;
let mirrorCubeRenderTarget = null;
let ceilingMirror = null;

// Global reference for NFT planes (for texture upgrades)
let picturePlanes = [];

// Create controls
const controls = new PointerLockControls(camera, document.body);

// Set pitch limits to prevent gimbal lock (polar angles)
// These limit how far up/down the user can look
controls.minPolarAngle = Math.PI * 0.05;  // Can look almost straight up (9°)
controls.maxPolarAngle = Math.PI * 0.95;  // Can look almost straight down (171°)

scene.add(controls.getObject());

// Key handlers
const onKeyDown = function (event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (!isJumping) {
        jumpVelocity = initialJumpVelocity;
        isJumping = true;
      }
      break;
  }
};

const onKeyUp = function (event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
};

// Add the event listeners for movement controls
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Window resize handler
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Note: mirrorCubeRenderTarget must stay square (cube maps require square faces)
  // Keep it at its original 1024x1024 size - no resize needed
});

// ----------------------------------------------------------------------
// Create Room Structure
// ----------------------------------------------------------------------
function createBasicRoom() {
  // Create floor with wood textures
  createMixedFloor();
  
  // Create textured walls
  createTexturedWalls();
  
  // Add lighting
  createLighting();
}

function createMixedFloor() {
  // Load custom B2 floor texture
  const textureLoader = new THREE.TextureLoader();

  // Load floor1 texture for the main floor
  const floorTexture = textureLoader.load('/assets/RoomB2/floor1.webp', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);  // Tile the texture 4x4 across the floor
    texture.colorSpace = THREE.SRGBColorSpace;
    console.log('✓ B2 floor texture loaded successfully');
  }, undefined, function(error) {
    console.error('Error loading B2 floor texture:', error);
  });

  // Create main floor with floor3 texture
  const mainFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
  const mainFloorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.7,
    metalness: 0.15
  });
  const mainFloor = new THREE.Mesh(mainFloorGeometry, mainFloorMaterial);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.position.y = groundLevel;
  mainFloor.receiveShadow = true;
  scene.add(mainFloor);

  console.log('✓ B2 custom floor created');
}

function createTexturedWalls() {
  // Wall thickness
  const wallThickness = 0.5;

  // Create walls with custom textures (no copper/metal decorations)
  createBaseWalls(wallThickness);

  // Place NFTs on walls
  placeNFTsOnWalls();
}

function createBaseWalls(thickness) {
  // Load custom wall textures for B2
  const textureLoader = new THREE.TextureLoader();

  // Load wall1 texture for front/back walls
  const wall1Texture = textureLoader.load('/assets/RoomB2/wall1.webp', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2); // Tile across wall
    texture.colorSpace = THREE.SRGBColorSpace;
    console.log('✓ B2 wall1 texture loaded');
  });

  // Load wall2 texture for left/right walls
  const wall2Texture = textureLoader.load('/assets/RoomB2/wall2.webp', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2); // Tile across wall
    texture.colorSpace = THREE.SRGBColorSpace;
    console.log('✓ B2 wall2 texture loaded');
  });

  // Create wall materials with custom textures (no metal)
  const wall1Material = new THREE.MeshStandardMaterial({
    map: wall1Texture,
    roughness: 0.8,
    metalness: 0.1
  });

  const wall2Material = new THREE.MeshStandardMaterial({
    map: wall2Texture,
    roughness: 0.8,
    metalness: 0.1
  });

  // Front wall (wall1)
  const frontWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, thickness);
  const frontWall = new THREE.Mesh(frontWallGeometry, wall1Material);
  frontWall.position.set(0, roomHeight/2, roomLength/2);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  // Back wall (wall1)
  const backWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, thickness);
  const backWall = new THREE.Mesh(backWallGeometry, wall1Material);
  backWall.position.set(0, roomHeight/2, -roomLength/2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Left wall (wall2)
  const leftWallGeometry = new THREE.BoxGeometry(thickness, roomHeight, roomLength);
  const leftWall = new THREE.Mesh(leftWallGeometry, wall2Material);
  leftWall.position.set(-roomWidth/2, roomHeight/2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right wall (wall2)
  const rightWallGeometry = new THREE.BoxGeometry(thickness, roomHeight, roomLength);
  const rightWall = new THREE.Mesh(rightWallGeometry, wall2Material);
  rightWall.position.set(roomWidth/2, roomHeight/2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Create mirror ceiling using dynamic cube camera
  createMirrorCeiling();

  console.log('✓ B2 custom walls created');
}

function createMirrorCeiling() {
  // Create a dynamic cube render target with HDR format for better reflections
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  // Note: RGBFormat is deprecated in Three.js r152+, omitting format to use default
  
  // Create cube camera for environment mapping
  const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
  cubeCamera.position.set(0, roomHeight - 0.5, 0); // Position just below the ceiling
  scene.add(cubeCamera);
  
  // Create a mirror material using the environment map from the cube camera
  const mirrorMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.05,     // Very low roughness for clear reflection
    metalness: 1.0,      // Fully metallic
    reflectivity: 1.0,   // Maximum reflectivity
    envMap: cubeRenderTarget.texture,  // Use the dynamic cube map
    envMapIntensity: 1.0, // Full intensity reflections
    color: 0xffffff,     // White base color for pure reflection
    side: THREE.FrontSide, // Only render front side for performance
  });
  
  // Create ceiling geometry (flipped to ensure normal direction is correct)
  const ceilingGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
  const ceiling = new THREE.Mesh(ceilingGeometry, mirrorMaterial);
  ceiling.rotation.x = Math.PI / 2; // Face downward
  ceiling.position.y = roomHeight;
  ceiling.receiveShadow = false; // Disable shadow receiving for mirror
  scene.add(ceiling);
  
  // Store references to update in animation loop
  mirrorCubeCamera = cubeCamera;
  mirrorCubeRenderTarget = cubeRenderTarget;
  ceilingMirror = ceiling;
  
  // Add some subtle colored lights near the ceiling to enhance reflections
  const ceilingAccentLight1 = new THREE.PointLight(0xc0ffff, 0.5, 60);
  ceilingAccentLight1.position.set(roomWidth * 0.25, roomHeight - 5, roomLength * 0.25);
  scene.add(ceilingAccentLight1);
  
  const ceilingAccentLight2 = new THREE.PointLight(0xffc0ff, 0.5, 60);
  ceilingAccentLight2.position.set(-roomWidth * 0.25, roomHeight - 5, -roomLength * 0.25);
  scene.add(ceilingAccentLight2);
}

// Organized NFT placement with progressive loading (15 per wall, 2 columns)
function placeNFTsOnWalls() {
  console.log('Placing NFTs with progressive loading...');

  const progressiveLoader = new ProgressiveTextureLoader((loaded, total) => {
    console.log(`Room B2: Loaded ${loaded}/${total} NFTs`);
  });

  const nftFiles = [
    'A_chess_game_between_a_mannequin_and_a_mirror_pieces_sculpted_2fb2d847-0753-454c-9353-dba90ba264c7_0',
    'A_massive_cube_of_black_ink_levitating_over_a_desert_salt_fla_b17f17f7-e952-4d25-9782-7f28d398ccb6_0',
    'Bedouin_caravan_cresting_ochre_dunes_at_golden_hour_shadows_c_d33dca3e-0218-4a20-88e3-995bd0ae3b68_0',
    'Detroit_warehouse_inferno_at_midnight_firefighters_silhouette_51befdea-9d4d-4361-9924-74c64c14c5c0_0',
    'Dhow_silhouette_on_the_Gulf_of_Oman_at_magenta_dusk_sail_clot_76154597-02b6-4538-a2bc-ab9f380586cb_0',
    'Electron_microscope_view_of_snowflake_crystal_at_50000x_magni_da08dd05-97c8-4343-b60c-f3bcb398180d_0',
    'Erupting_coralspire_volcanic_fury_towering_reef-spire_of_crim_422353f9-bc74-4ed5-a8b3-991ceeaa23c4_0',
    'Exploding_velvet_nebula_plush_crimson_cosmos_tears_apart_into_88bfd611-c7cb-48ae-ac29-d59cd74dd784_0',
    'Industrial_shipyard_at_sunset_silhouettes_of_gantry_cranes_co_d4547443-dfb3-48e1-a5a6-26a7dd4ed99c_0',
    'Inside_a_barreling_wave_surf_photographer_captures_water_wall_deb2fa07-e658-46a1-bcb7-c79e7d6c6a3f_0',
    'Inside_sapphire-blue_Antarctic_ice_cave_diffuse_skylight_make_fc937a9c-19b8-4481-9f0c-b942de0999e2_0',
    'Kreuzberg_Berlin_after_rain_street_lights_reflect_razor-sharp_ef3fb5f7-2967-4685-a6c0-a9a6c9687194_0',
    'Levitating_rust_monks_corroded_monks_hover_in_iron_desert_ora_6f3555e6-9da3-48f6-bf64-f39352ec109e_0',
    'lokigod69._Ghost-town_Route_66_gas_station_at_high_noon_cracked_4e48ea26-6583-425b-91aa-49b87342bc09',
    'lokigod69._Gleaming_marble_metro_station_in_Saint_Petersburg_fl_320f99eb-9a87-4d29-9252-74ecb1d86b69',
    'lokigod69._Golden_wheat_field_beneath_gathering_thunderheads_so_97dea6f1-b869-4cab-98a5-a92a7eebcbd5',
    'lokigod69._Graffiti_mural_in_narrow_city_alley_melts_pigments_f_176ee3bc-0d4f-415e-aab4-86d20ef354cf',
    'lokigod69._Graffiti_mural_in_narrow_city_alley_melts_pigments_f_52a45485-ca41-4c7d-a998-6d53490c754b',
    'lokigod69._Hawaiian_lava_river_meeting_Pacific_at_night_steam_p_63b97eda-98d8-44fa-b652-5163e36b46a0',
    'lokigod69._Herd_of_Icelandic_horses_thundering_across_lupine-sp_0314757b-0b36-4e74-acfb-a040837bed73',
    'lokigod69._High-speed_140_000_s_capture_of_artisan_chocolatier__e8cc3d31-c141-4b2b-a835-74f129a9d9ad',
    'lokigod69._Humpback_whale_breaches_beside_small_sailboat_midday_0972ee55-a981-409c-8966-402699f622d9',
    'lokigod69._Hyperrealistic_human_eye_macro_in_monochrome_capture_17ea5b9b-2f4a-4ace-9024-45dfbebf11b5',
    'lokigod69._Joshua_Tree_desert_night_long_exposure_stars_appear__3ca58e0b-e85e-45e9-a57f-2924021b93fb',
    'lokigod69._Karst_river_dawn_in_Guangxi_lone_fisherman_on_bamboo_f5885458-0581-4ed6-8466-3db685a686a0',
    'lokigod69._Laboratory_cross-section_of_1000-year_redwood_trunk__0224490d-e752-46df-a97f-5c72a6367df8',
    'lokigod69._Levitating_rust_monks_corroded_monks_hover_in_iron_d_6f3555e6-9da3-48f6-bf64-f39352ec109e',
    'lokigod69._Macro_close-up_of_a_single_blade_of_prairie_grass_at_32e68126-48c6-418f-9a33-04bfcda171f2',
    'lokigod69._Macro_dandelion_seed_head_backlit_every_filament_agl_be31f5a0-9812-4f25-8421-e71386bbb815',
    'lokigod69._Mirror-still_alpine_lake_in_British_Columbia_at_dawn_28655554-a7ff-4ba4-bd45-2f7f8ce0ee09',
    'lokigod69._Moonlit_salt_flats_of_Salar_de_Uyuni_during_wet_seas_aa695a69-e1e6-40cc-ab2d-4058863425e1',
    'lokigod69._Mycelium_circuit_board_bio-luminous_fungus_traces_si_3d2a66da-9fb5-4a6a-9259-21546c10699d',
    'lokigod69._Mycelium_circuit_board_bio-luminous_fungus_traces_si_44df0fd6-2194-4834-9342-60373353a122',
    'lokigod69._Night_dive_beneath_Maldivian_atoll_manta_ray_swoops__6c1caf92-234e-4306-af30-7d1604ba9ea6',
    'lokigod69._Night-shift_freight_yard_outside_Hamburg_rust-red_ca_8803256c-9038-456a-81f5-6f40da29ed8c',
    'lokigod69._Opalescent_tide_hunters_pearl-skinned_nomads_riding__f3872ae3-7487-48b6-9678-42188c391dc0',
    'lokigod69._Pacific_tide_pool_low_tide_ochre_starfish_its_arms_d_8368817c-0582-42ae-8c29-5c9d97a14203',
    'lokigod69._Portrait_of_proud_Maasai_warrior_in_dusty_savanna_co_521906ca-4ee1-42cd-af30-a1dcd7ac3061',
    'lokigod69._Pulsating_fog_armada_ghost_ships_materialize_in_thro_d6da6d85-fad5-452a-931a-6cc99d9de59a',
    'lokigod69._Rain-drenched_back-alley_ramen_bar_in_Osaka_crimson__3d388fa3-d623-4071-ba86-b6becf4392e0',
    'lokigod69._Rain-forest_gecko_clinging_to_leaf_skin_pattern_morp_17d231f6-82d7-4d8c-a6d5-0a1d21d66c68',
    'lokigod69._Rhodium_skull_forge_silver_skulls_pour_from_blazing__9b1f4bac-ffb8-4b63-ba38-999243970ffc',
    'lokigod69._Road-trip_snapshot_in_Arizona_desert_vintage_station_c14ee9b0-5f54-4574-b01a-abdf515344d4',
    'lokigod69._Saharan_dust_storm_whipping_across_solar_array_at_no_676fb8d9-eacd-41af-a4d4-eb70a31fe722',
    'lokigod69._Saharan_dust_storm_whipping_across_solar_array_at_no_6ca2e5f0-16f0-4e3a-90d4-0bee23dfeeeb',
    'lokigod69._Snow_leopard_mid-pounce_frozen_at_13200_s_each_whisk_ec091e74-ec9b-4457-865b-04294831704a',
    'lokigod69._Spinning_quartz_prison_rotating_crystal_cage_reflect_7249b37f-02a6-4b6a-a8c2-0a89eff14a40',
    'lokigod69._Sunset_silhouette_of_lone_acacia_on_Serengeti_branch_50a43d3f-6e25-4551-90bc-9931bac1b753',
    'lokigod69._Tibetan_yak_standing_on_snow-swept_pass_braided_harn_fad47318-6529-4c3e-aea9-b225951f1f61',
    'lokigod69._Top-down_drone_of_Danakil_salt_flats_workers_crystal_17929bdb-9ad9-4a62-9317-25ac0d1b81e1',
    'lokigod69._Top-down_drone_of_Danakil_salt_flats_workers_crystal_3aba4678-f9b4-43b5-aa9a-19a438c5841f',
    'lokigod69._Top-down_drone_shot_of_Rotterdam_shipping_port_at_du_3bad76e6-5f73-4bc6-afee-833da2ec74be',
    'lokigod69._Torrential_rain_on_Manhattans_High_Line_puddles_pool_24fc3410-4e79-4bc4-88b8-9db278a25761',
    'Monochrome_rainforest_canopy_aerial_view_shot_from_helicopter_dbbbee82-4a03-4b61-a90a-d9fd6c60150b_0',
    'Norwegian_fjord_cliff_base_midnight_sun_grazing_rock_waterfal_51154a84-ab03-4887-b81f-0e80c7fe30e3_0',
    'Opalescent_tide_hunters_pearl-skinned_nomads_riding_crystal_m_f3872ae3-7487-48b6-9678-42188c391dc0_0',
    'Pre-monsoon_Bangalore_rooftop_sari_billowing_in_hot_up-draft__1111ff21-0657-468d-8cfb-1a6326b5914a_0',
    'Rain-forest_tree-frog_clings_to_a_glass_pane_at_night_twin_LE_eb22b6c2-bbce-4c91-bd68-736f1a71f1f9_0',
    'Rain-slicked_alley_in_Lisbons_Alfama_district_fado_guitarist__6227acce-247f-408c-ab1a-efd1d7d216f0_0',
    'Street-fashion_capture_of_a_woman_crossing_zebra_stripes_fabr_34b3d99c-065e-4f18-ab38-186e8562ab3b_0'
  ];

  const nftsPerWall = 15;
  const wallMargin = 15;
  const minY = 10;
  const maxY = roomHeight - 8;
  const columns = 2;
  const defaultFrameSize = 12;

  const wallNames = ['front', 'back', 'left', 'right'];
  const wallDims = {
    front: { width: roomWidth },
    back: { width: roomWidth },
    left: { width: roomLength },
    right: { width: roomLength }
  };

  // Place 60 NFTs with instant placeholders
  nftFiles.forEach((filename, index) => {
    const wallIndex = Math.floor(index / nftsPerWall) % 4;
    const wallName = wallNames[wallIndex];
    const posInWall = index % nftsPerWall;
    const wallDim = wallDims[wallName];

    // Calculate grid position
    const col = posInWall % columns;
    const row = Math.floor(posInWall / columns);
    const usableWidth = wallDim.width - (wallMargin * 2);
    const usableHeight = maxY - minY;
    const colSpacing = usableWidth / (columns + 1);
    const actualRows = Math.ceil(nftsPerWall / columns);
    const rowSpacing = usableHeight / (actualRows + 1);
    const xPos = -wallDim.width / 2 + wallMargin + colSpacing * (col + 1);
    const yPos = minY + rowSpacing * (row + 1);

    const textureUrl = `/assets/RoomB2/${filename}.webp`;

    // Get placeholder material immediately
    const { placeholderMaterial, upgradePromise } = progressiveLoader.loadWithPlaceholder(textureUrl, {
      side: THREE.DoubleSide
    });

    // Create frame with placeholder (instant visible)
    placeArtFrameOnWallWithMaterial(wallName, placeholderMaterial, defaultFrameSize, defaultFrameSize, xPos, yPos);

    // Upgrade when texture loads
    upgradePromise.then((fullResMaterial) => {
      const planes = picturePlanes.filter(p => p.userData && p.userData.imageUrl === textureUrl);
      planes.forEach(plane => {
        plane.material = fullResMaterial;
        plane.material.needsUpdate = true;
      });
    }).catch(err => {
      console.error(`Failed to load texture for ${filename}:`, err);
    });
  });

  // DEFER COPPER LOADING by 2 seconds
  setTimeout(() => {
    console.log('Starting copper wave patterns...');
    addCopperWavePatterns();
  }, 2000);

  console.log(`Room B2: Placed ${nftFiles.length} NFTs in organized grid`);
}

function addCopperWavePatterns() {
  // Load copper textures (different subset for Room B2)
  const textureLoader = new THREE.TextureLoader();
  const copperTextures = [];

  const copperFiles = [
    getTextureUrl('copper2'),
    getTextureUrl('copper3'),
    getTextureUrl('copper4')
  ];
  
  // Load all copper textures
  copperFiles.forEach((file, index) => {
    const texture = textureLoader.load(file, function(texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      console.log(`Copper texture ${index+1} loaded successfully`);
    }, undefined, function(error) {
      console.error(`Error loading copper texture ${index+1}:`, error);
    });
    copperTextures.push(texture);
  });
  
  // Create materials for each copper texture
  const copperMaterials = copperTextures.map(texture => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.8,
      color: 0xddaa88 // Slight copper tint
    });
  });
  
  // Define the golden ratio
  const phi = 1.618033988749895;
  
  // Define tile dimensions - significantly smaller than before
  const tileWidth = 3.5;  // Reduced from 8
  const tileHeight = 3.5; // Reduced from 8
  const tileDepth = 0.12;
  
  // Add copper decorations to each wall
  addWaveToWall('front', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
  addWaveToWall('back', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
  addWaveToWall('left', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
  addWaveToWall('right', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
}

function addWaveToWall(wallType, materials, tileWidth, tileHeight, tileDepth, phi) {
  // Determine wall dimensions and orientation
  let wallLength, wallHeight, isHorizontal;
  let baseX, baseY, baseZ, rotationY;
  const wallOffset = 0.25; // Increased offset from wall to make tiles clearly visible
  
  switch(wallType) {
    case 'front':
      wallLength = roomWidth;
      wallHeight = roomHeight;
      isHorizontal = true;
      baseX = 0;
      baseY = 0;
      baseZ = roomLength/2 - wallOffset; // Positioned clearly in front of the wall
      rotationY = 0;
      break;
    case 'back':
      wallLength = roomWidth;
      wallHeight = roomHeight;
      isHorizontal = true;
      baseX = 0;
      baseY = 0;
      baseZ = -roomLength/2 + wallOffset; // Positioned clearly in front of the wall
      rotationY = Math.PI;
      break;
    case 'left':
      wallLength = roomLength;
      wallHeight = roomHeight;
      isHorizontal = false;
      baseX = -roomWidth/2 + wallOffset; // Positioned clearly in front of the wall
      baseY = 0;
      baseZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallLength = roomLength;
      wallHeight = roomHeight;
      isHorizontal = false;
      baseX = roomWidth/2 - wallOffset; // Positioned clearly in front of the wall
      baseY = 0;
      baseZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }
  
  // Calculate the vertical range for tile placement
  const minHeight = 0;
  const maxHeight = 2 * phi;
  
  // Number of tiles to create
  const tilesPerWall = Math.floor(wallLength / tileWidth * 0.4);
  
  // Calculate horizontal bounds for placing tiles
  const leftBound = -wallLength/2 + tileWidth;
  const rightBound = wallLength/2 - tileWidth;
  
  // Create bottom area copper tiles
  for (let i = 0; i < tilesPerWall; i++) {
    // Random position within the bottom area
    const randomPosition = Math.random() * (rightBound - leftBound) + leftBound;
    const randomHeight = Math.random() * maxHeight + minHeight;
    
    // Select a random copper material
    const randomMaterialIndex = Math.floor(Math.random() * materials.length);
    const selectedMaterial = materials[randomMaterialIndex].clone();
    
    // Enhance material settings to make tiles more visible
    selectedMaterial.roughness = 0.4; // More shiny
    selectedMaterial.metalness = 0.9; // More metallic
    selectedMaterial.emissive = new THREE.Color(0x331100); // Subtle glow
    selectedMaterial.emissiveIntensity = 0.15;
    
    // Use BoxGeometry for 3D appearance but very thin (visible depth)
    const shapeType = Math.floor(Math.random() * 3);
    let tileGeometry;
    let aspectRatio = 1.0; // Default is square
    
    switch(shapeType) {
      case 0:
        // Standard rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth, tileHeight, 0.1);
        break;
      case 1:
        // Wider rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 1.2, tileHeight * 0.8, 0.1);
        aspectRatio = 1.5;
        break;
      case 2:
        // Taller rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 0.8, tileHeight * 1.2, 0.1);
        aspectRatio = 0.75;
        break;
    }
    
    const tile = new THREE.Mesh(tileGeometry, selectedMaterial);
    
    // Position tile based on wall orientation with small random offset for depth variation
    const depthVariation = (Math.random() * 0.1) + 0.05; // Small random additional offset
    
    if (isHorizontal) {
      // For front/back walls
      tile.position.set(
        baseX + randomPosition,
        baseY + tileHeight/2 + randomHeight,
        baseZ - (wallType === 'front' ? depthVariation : -depthVariation)
      );
      // Make sure correct face is showing
      if (wallType === 'front') {
        tile.rotation.y = Math.PI;
      }
    } else {
      // For left/right walls
      tile.position.set(
        baseX - (wallType === 'left' ? -depthVariation : depthVariation),
        baseY + tileHeight/2 + randomHeight,
        baseZ + randomPosition
      );
      // Make sure correct face is showing
      if (wallType === 'left') {
        tile.rotation.y = Math.PI;
      }
    }
    
    // Apply wall rotation - this makes the tile face outward from the wall
    tile.rotation.y += rotationY;
    
    // Random scale factor for varied sizes but maintaining the tile's aspect ratio
    const randomScale = 0.3 + Math.random() * 1.5;
    if (aspectRatio === 1.0) {
      tile.scale.set(randomScale, randomScale, 1);
    } else if (aspectRatio > 1.0) {
      // For wider tiles
      tile.scale.set(randomScale * aspectRatio, randomScale, 1);
    } else {
      // For taller tiles
      tile.scale.set(randomScale, randomScale / aspectRatio, 1);
    }
    
    tile.castShadow = true; // Enable shadows to increase visibility
    tile.receiveShadow = true;
    scene.add(tile);
  }
  
  // Create top area copper tiles (mirror of bottom area)
  for (let i = 0; i < tilesPerWall; i++) {
    // Random position within the top area
    const randomPosition = Math.random() * (rightBound - leftBound) + leftBound;
    const randomHeight = Math.random() * maxHeight + minHeight;
    
    // Select a random copper material
    const randomMaterialIndex = Math.floor(Math.random() * materials.length);
    const selectedMaterial = materials[randomMaterialIndex].clone();
    
    // Enhance material settings to make tiles more visible
    selectedMaterial.roughness = 0.4; // More shiny
    selectedMaterial.metalness = 0.9; // More metallic
    selectedMaterial.emissive = new THREE.Color(0x331100); // Subtle glow
    selectedMaterial.emissiveIntensity = 0.15;
    
    // Use BoxGeometry for 3D appearance but very thin (visible depth)
    const shapeType = Math.floor(Math.random() * 3);
    let tileGeometry;
    let aspectRatio = 1.0; // Default is square
    
    switch(shapeType) {
      case 0:
        // Standard rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth, tileHeight, 0.1);
        break;
      case 1:
        // Wider rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 1.2, tileHeight * 0.8, 0.1);
        aspectRatio = 1.5;
        break;
      case 2:
        // Taller rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 0.8, tileHeight * 1.2, 0.1);
        aspectRatio = 0.75;
        break;
    }
    
    const tile = new THREE.Mesh(tileGeometry, selectedMaterial);
    
    // Position tile based on wall orientation with small random offset for depth variation
    const depthVariation = (Math.random() * 0.1) + 0.05; // Small random additional offset
    
    if (isHorizontal) {
      // For front/back walls
      tile.position.set(
        baseX + randomPosition,
        baseY + wallHeight - tileHeight/2 - randomHeight,
        baseZ - (wallType === 'front' ? depthVariation : -depthVariation)
      );
      // Make sure correct face is showing
      if (wallType === 'front') {
        tile.rotation.y = Math.PI;
      }
    } else {
      // For left/right walls
      tile.position.set(
        baseX - (wallType === 'left' ? -depthVariation : depthVariation),
        baseY + wallHeight - tileHeight/2 - randomHeight,
        baseZ + randomPosition
      );
      // Make sure correct face is showing
      if (wallType === 'left') {
        tile.rotation.y = Math.PI;
      }
    }
    
    // Apply wall rotation - this makes the tile face outward from the wall
    tile.rotation.y += rotationY;
    
    // Random scale factor for varied sizes but maintaining the tile's aspect ratio
    const randomScale = 0.3 + Math.random() * 1.5;
    if (aspectRatio === 1.0) {
      tile.scale.set(randomScale, randomScale, 1);
    } else if (aspectRatio > 1.0) {
      // For wider tiles
      tile.scale.set(randomScale * aspectRatio, randomScale, 1);
    } else {
      // For taller tiles
      tile.scale.set(randomScale, randomScale / aspectRatio, 1);
    }
    
    tile.castShadow = true; // Enable shadows to increase visibility
    tile.receiveShadow = true;
    scene.add(tile);
  }
  
  // Add stronger lighting to highlight copper tiles
  const spotLight = new THREE.SpotLight(0xffe8d6, 0.8); // Increased intensity
  if (isHorizontal) {
    spotLight.position.set(baseX, wallHeight * 0.6, baseZ - (wallType === 'front' ? 15 : -15));
    spotLight.target.position.set(baseX, wallHeight * 0.3, baseZ);
  } else {
    spotLight.position.set(baseX - (wallType === 'right' ? 15 : -15), wallHeight * 0.6, baseZ);
    spotLight.target.position.set(baseX, wallHeight * 0.3, baseZ);
  }
  spotLight.angle = Math.PI / 5; // Wider angle
  spotLight.penumbra = 0.5; // Softer edges
  spotLight.decay = 1.2;
  spotLight.distance = 60;
  scene.add(spotLight);
  scene.add(spotLight.target);
  
  // Add a second highlight light from different angle
  const accentLight = new THREE.PointLight(0xffccaa, 0.5);
  if (isHorizontal) {
    accentLight.position.set(baseX + 20, wallHeight * 0.25, baseZ - (wallType === 'front' ? 10 : -10));
  } else {
    accentLight.position.set(baseX - (wallType === 'right' ? 10 : -10), wallHeight * 0.25, baseZ + 20);
  }
  scene.add(accentLight);
}

// Create a global position registry to track occupied positions on each wall
const positionRegistry = {
  front: [],
  back: [],
  left: [],
  right: []
};

// Utility function to check if a position is occupied
function isPositionOccupied(wallType, centerX, centerY, width, height, buffer = 1.0) {
  const registry = positionRegistry[wallType];
  
  // Create bounding box for the new item with buffer
  const newItemBounds = {
    left: centerX - (width / 2) - buffer,
    right: centerX + (width / 2) + buffer,
    top: centerY + (height / 2) + buffer,
    bottom: centerY - (height / 2) - buffer
  };
  
  // Check against all existing items
  for (const item of registry) {
    // Check for overlap with simple rectangle intersection
    if (!(newItemBounds.left > item.right || 
          newItemBounds.right < item.left || 
          newItemBounds.bottom > item.top || 
          newItemBounds.top < item.bottom)) {
      return true; // Overlap detected
    }
  }
  
  return false; // No overlap
}

// Utility function to register a position as occupied
function registerOccupiedPosition(wallType, centerX, centerY, width, height, buffer = 1.0) {
  const registry = positionRegistry[wallType];
  
  registry.push({
    left: centerX - (width / 2) - buffer,
    right: centerX + (width / 2) + buffer,
    top: centerY + (height / 2) + buffer,
    bottom: centerY - (height / 2) - buffer,
    centerX: centerX,
    centerY: centerY
  });
}

// Function to find a random unoccupied position on a wall
function findUnoccupiedPosition(wallType, itemWidth, itemHeight, minHeight, maxHeight) {
  const wallDimensions = getWallDimensions(wallType);
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Generate random position within wall bounds (accounting for item size)
    const buffer = itemWidth * 0.5;
    const randomX = Math.random() * (wallDimensions.width - (itemWidth + buffer * 2)) - wallDimensions.width/2 + itemWidth/2 + buffer;
    
    // Randomly choose a height between minHeight and maxHeight
    const randomY = Math.random() * (maxHeight - minHeight) + minHeight;
    
    // Check if position is occupied
    if (!isPositionOccupied(wallType, randomX, randomY, itemWidth, itemHeight)) {
      // Register this position as occupied
      registerOccupiedPosition(wallType, randomX, randomY, itemWidth, itemHeight);
      return { x: randomX, y: randomY };
    }
  }
  
  console.warn(`Could not find unoccupied position for ${wallType} wall after ${maxAttempts} attempts`);
  return null; // Could not find unoccupied position
}

// Helper function to get wall dimensions
function getWallDimensions(wallType) {
  switch(wallType) {
    case 'front':
    case 'back':
      return { width: roomWidth, height: roomHeight };
    case 'left':
    case 'right':
      return { width: roomLength, height: roomHeight };
    default:
      return { width: 0, height: 0 };
  }
}

function addMixedDecorationsToWalls() {
  // Load copper textures (different subset for Room B2)
  const textureLoader = new THREE.TextureLoader();
  const copperTextures = [];

  const copperFiles = [
    getTextureUrl('copper2'),
    getTextureUrl('copper3'),
    getTextureUrl('copper4')
  ];

  // Batched loading configuration
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 400; // 400ms delay between batches

  // Load copper textures in batches
  function loadCopperBatch(startIndex) {
    const endIndex = Math.min(startIndex + BATCH_SIZE, copperFiles.length);

    for (let i = startIndex; i < endIndex; i++) {
      const file = copperFiles[i];
      const texture = textureLoader.load(file, function(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        console.log(`Copper texture ${i+1}/${copperFiles.length} loaded`);
      }, undefined, function(error) {
        console.error(`Error loading copper texture ${i+1}:`, error);
      });
      copperTextures.push(texture);
    }

    // Load next batch if there are more textures
    if (endIndex < copperFiles.length) {
      setTimeout(() => loadCopperBatch(endIndex), BATCH_DELAY);
    } else {
      // Start loading NFT textures after copper textures are queued
      setTimeout(() => loadAndPlaceNFT(0), BATCH_DELAY);
    }
  }

  // Create materials for each copper texture (will be populated as textures load)
  const copperMaterials = copperFiles.map(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.8,
      color: 0xddaa88 // Slight copper tint
    });
  });

  // Update materials as textures load
  copperTextures.forEach((texture, index) => {
    copperMaterials[index].map = texture;
    copperMaterials[index].needsUpdate = true;
  });

  // NFT Loading System - Load images first to get dimensions, then place with correct aspect ratio
  // This ensures all artwork is displayed in its original proportions

  // Room B2 NFT files (60 PNG images with descriptive names)
  const nftFiles = [
    'A_chess_game_between_a_mannequin_and_a_mirror_pieces_sculpted_2fb2d847-0753-454c-9353-dba90ba264c7_0',
    'A_massive_cube_of_black_ink_levitating_over_a_desert_salt_fla_b17f17f7-e952-4d25-9782-7f28d398ccb6_0',
    'Bedouin_caravan_cresting_ochre_dunes_at_golden_hour_shadows_c_d33dca3e-0218-4a20-88e3-995bd0ae3b68_0',
    'Detroit_warehouse_inferno_at_midnight_firefighters_silhouette_51befdea-9d4d-4361-9924-74c64c14c5c0_0',
    'Dhow_silhouette_on_the_Gulf_of_Oman_at_magenta_dusk_sail_clot_76154597-02b6-4538-a2bc-ab9f380586cb_0',
    'Electron_microscope_view_of_snowflake_crystal_at_50000x_magni_da08dd05-97c8-4343-b60c-f3bcb398180d_0',
    'Erupting_coralspire_volcanic_fury_towering_reef-spire_of_crim_422353f9-bc74-4ed5-a8b3-991ceeaa23c4_0',
    'Exploding_velvet_nebula_plush_crimson_cosmos_tears_apart_into_88bfd611-c7cb-48ae-ac29-d59cd74dd784_0',
    'Industrial_shipyard_at_sunset_silhouettes_of_gantry_cranes_co_d4547443-dfb3-48e1-a5a6-26a7dd4ed99c_0',
    'Inside_a_barreling_wave_surf_photographer_captures_water_wall_deb2fa07-e658-46a1-bcb7-c79e7d6c6a3f_0',
    'Inside_sapphire-blue_Antarctic_ice_cave_diffuse_skylight_make_fc937a9c-19b8-4481-9f0c-b942de0999e2_0',
    'Kreuzberg_Berlin_after_rain_street_lights_reflect_razor-sharp_ef3fb5f7-2967-4685-a6c0-a9a6c9687194_0',
    'Levitating_rust_monks_corroded_monks_hover_in_iron_desert_ora_6f3555e6-9da3-48f6-bf64-f39352ec109e_0',
    'lokigod69._Ghost-town_Route_66_gas_station_at_high_noon_cracked_4e48ea26-6583-425b-91aa-49b87342bc09',
    'lokigod69._Gleaming_marble_metro_station_in_Saint_Petersburg_fl_320f99eb-9a87-4d29-9252-74ecb1d86b69',
    'lokigod69._Golden_wheat_field_beneath_gathering_thunderheads_so_97dea6f1-b869-4cab-98a5-a92a7eebcbd5',
    'lokigod69._Graffiti_mural_in_narrow_city_alley_melts_pigments_f_176ee3bc-0d4f-415e-aab4-86d20ef354cf',
    'lokigod69._Graffiti_mural_in_narrow_city_alley_melts_pigments_f_52a45485-ca41-4c7d-a998-6d53490c754b',
    'lokigod69._Hawaiian_lava_river_meeting_Pacific_at_night_steam_p_63b97eda-98d8-44fa-b652-5163e36b46a0',
    'lokigod69._Herd_of_Icelandic_horses_thundering_across_lupine-sp_0314757b-0b36-4e74-acfb-a040837bed73',
    'lokigod69._High-speed_140_000_s_capture_of_artisan_chocolatier__e8cc3d31-c141-4b2b-a835-74f129a9d9ad',
    'lokigod69._Humpback_whale_breaches_beside_small_sailboat_midday_0972ee55-a981-409c-8966-402699f622d9',
    'lokigod69._Hyperrealistic_human_eye_macro_in_monochrome_capture_17ea5b9b-2f4a-4ace-9024-45dfbebf11b5',
    'lokigod69._Joshua_Tree_desert_night_long_exposure_stars_appear__3ca58e0b-e85e-45e9-a57f-2924021b93fb',
    'lokigod69._Karst_river_dawn_in_Guangxi_lone_fisherman_on_bamboo_f5885458-0581-4ed6-8466-3db685a686a0',
    'lokigod69._Laboratory_cross-section_of_1000-year_redwood_trunk__0224490d-e752-46df-a97f-5c72a6367df8',
    'lokigod69._Levitating_rust_monks_corroded_monks_hover_in_iron_d_6f3555e6-9da3-48f6-bf64-f39352ec109e',
    'lokigod69._Macro_close-up_of_a_single_blade_of_prairie_grass_at_32e68126-48c6-418f-9a33-04bfcda171f2',
    'lokigod69._Macro_dandelion_seed_head_backlit_every_filament_agl_be31f5a0-9812-4f25-8421-e71386bbb815',
    'lokigod69._Mirror-still_alpine_lake_in_British_Columbia_at_dawn_28655554-a7ff-4ba4-bd45-2f7f8ce0ee09',
    'lokigod69._Moonlit_salt_flats_of_Salar_de_Uyuni_during_wet_seas_aa695a69-e1e6-40cc-ab2d-4058863425e1',
    'lokigod69._Mycelium_circuit_board_bio-luminous_fungus_traces_si_3d2a66da-9fb5-4a6a-9259-21546c10699d',
    'lokigod69._Mycelium_circuit_board_bio-luminous_fungus_traces_si_44df0fd6-2194-4834-9342-60373353a122',
    'lokigod69._Night_dive_beneath_Maldivian_atoll_manta_ray_swoops__6c1caf92-234e-4306-af30-7d1604ba9ea6',
    'lokigod69._Night-shift_freight_yard_outside_Hamburg_rust-red_ca_8803256c-9038-456a-81f5-6f40da29ed8c',
    'lokigod69._Opalescent_tide_hunters_pearl-skinned_nomads_riding__f3872ae3-7487-48b6-9678-42188c391dc0',
    'lokigod69._Pacific_tide_pool_low_tide_ochre_starfish_its_arms_d_8368817c-0582-42ae-8c29-5c9d97a14203',
    'lokigod69._Portrait_of_proud_Maasai_warrior_in_dusty_savanna_co_521906ca-4ee1-42cd-af30-a1dcd7ac3061',
    'lokigod69._Pulsating_fog_armada_ghost_ships_materialize_in_thro_d6da6d85-fad5-452a-931a-6cc99d9de59a',
    'lokigod69._Rain-drenched_back-alley_ramen_bar_in_Osaka_crimson__3d388fa3-d623-4071-ba86-b6becf4392e0',
    'lokigod69._Rain-forest_gecko_clinging_to_leaf_skin_pattern_morp_17d231f6-82d7-4d8c-a6d5-0a1d21d66c68',
    'lokigod69._Rhodium_skull_forge_silver_skulls_pour_from_blazing__9b1f4bac-ffb8-4b63-ba38-999243970ffc',
    'lokigod69._Road-trip_snapshot_in_Arizona_desert_vintage_station_c14ee9b0-5f54-4574-b01a-abdf515344d4',
    'lokigod69._Saharan_dust_storm_whipping_across_solar_array_at_no_676fb8d9-eacd-41af-a4d4-eb70a31fe722',
    'lokigod69._Saharan_dust_storm_whipping_across_solar_array_at_no_6ca2e5f0-16f0-4e3a-90d4-0bee23dfeeeb',
    'lokigod69._Snow_leopard_mid-pounce_frozen_at_13200_s_each_whisk_ec091e74-ec9b-4457-865b-04294831704a',
    'lokigod69._Spinning_quartz_prison_rotating_crystal_cage_reflect_7249b37f-02a6-4b6a-a8c2-0a89eff14a40',
    'lokigod69._Sunset_silhouette_of_lone_acacia_on_Serengeti_branch_50a43d3f-6e25-4551-90bc-9931bac1b753',
    'lokigod69._Tibetan_yak_standing_on_snow-swept_pass_braided_harn_fad47318-6529-4c3e-aea9-b225951f1f61',
    'lokigod69._Top-down_drone_of_Danakil_salt_flats_workers_crystal_17929bdb-9ad9-4a62-9317-25ac0d1b81e1',
    'lokigod69._Top-down_drone_of_Danakil_salt_flats_workers_crystal_3aba4678-f9b4-43b5-aa9a-19a438c5841f',
    'lokigod69._Top-down_drone_shot_of_Rotterdam_shipping_port_at_du_3bad76e6-5f73-4bc6-afee-833da2ec74be',
    'lokigod69._Torrential_rain_on_Manhattans_High_Line_puddles_pool_24fc3410-4e79-4bc4-88b8-9db278a25761',
    'Monochrome_rainforest_canopy_aerial_view_shot_from_helicopter_dbbbee82-4a03-4b61-a90a-d9fd6c60150b_0',
    'Norwegian_fjord_cliff_base_midnight_sun_grazing_rock_waterfal_51154a84-ab03-4887-b81f-0e80c7fe30e3_0',
    'Opalescent_tide_hunters_pearl-skinned_nomads_riding_crystal_m_f3872ae3-7487-48b6-9678-42188c391dc0_0',
    'Pre-monsoon_Bangalore_rooftop_sari_billowing_in_hot_up-draft__1111ff21-0657-468d-8cfb-1a6326b5914a_0',
    'Rain-forest_tree-frog_clings_to_a_glass_pane_at_night_twin_LE_eb22b6c2-bbce-4c91-bd68-736f1a71f1f9_0',
    'Rain-slicked_alley_in_Lisbons_Alfama_district_fado_guitarist__6227acce-247f-408c-ab1a-efd1d7d216f0_0',
    'Street-fashion_capture_of_a_woman_crossing_zebra_stripes_fabr_34b3d99c-065e-4f18-ab38-186e8562ab3b_0'
  ].map(name => `RoomB2/${name}`);

  const minHeight = 5;
  const maxHeight = roomHeight - 5;
  const wallTypes = ['front', 'back', 'left', 'right'];
  const maxFrameDimension = 12; // Maximum size for any dimension
  const minFrameDimension = 6;  // Minimum size for any dimension

  let loadedCount = 0;
  let currentWallIndex = 0;

  console.log('Loading NFTs with proper aspect ratios...');

  // Load each NFT, get its dimensions, then place it with correct aspect ratio
  function loadAndPlaceNFT(index) {
    if (index >= nftFiles.length) {
      console.log(`Finished loading ${loadedCount} NFTs with proper aspect ratios`);
      return;
    }

    const filename = nftFiles[index];
    const img = new Image();

    img.onload = function() {
      // Calculate aspect ratio and frame dimensions
      const aspectRatio = img.width / img.height;
      let frameWidth, frameHeight;

      if (aspectRatio >= 1) {
        // Wider than tall (landscape or square)
        frameWidth = maxFrameDimension;
        frameHeight = maxFrameDimension / aspectRatio;
        if (frameHeight < minFrameDimension) {
          frameHeight = minFrameDimension;
          frameWidth = frameHeight * aspectRatio;
        }
      } else {
        // Taller than wide (portrait)
        frameHeight = maxFrameDimension;
        frameWidth = maxFrameDimension * aspectRatio;
        if (frameWidth < minFrameDimension) {
          frameWidth = minFrameDimension;
          frameHeight = frameWidth / aspectRatio;
        }
      }

      // Distribute across walls evenly
      const wallType = wallTypes[currentWallIndex % 4];
      currentWallIndex++;

      // Find position for this NFT
      const position = findUnoccupiedPosition(wallType, frameWidth, frameHeight, minHeight, maxHeight);

      if (position) {
        // Load the actual texture
        textureLoader.load(
          `/assets/${filename}.webp`,
          function(tex) {
            tex.colorSpace = THREE.SRGBColorSpace;

            const artMaterial = new THREE.MeshBasicMaterial({
              map: tex,
              side: THREE.DoubleSide
            });

            placeArtFrameOnWallWithMaterial(wallType, artMaterial, frameWidth, frameHeight, position.x, position.y);
            loadedCount++;
            console.log(`Placed NFT ${loadedCount}/${nftFiles.length}: ${filename} (${img.width}x${img.height} -> ${frameWidth.toFixed(1)}x${frameHeight.toFixed(1)})`);

            // Load next NFT
            setTimeout(() => loadAndPlaceNFT(index + 1), 30);
          },
          undefined,
          function(error) {
            console.error(`Error loading NFT texture ${filename}:`, error);
            setTimeout(() => loadAndPlaceNFT(index + 1), 30);
          }
        );
      } else {
        // Try other walls if first choice didn't work
        let placed = false;
        for (const tryWall of wallTypes) {
          const tryPos = findUnoccupiedPosition(tryWall, frameWidth, frameHeight, minHeight, maxHeight);
          if (tryPos) {
            textureLoader.load(
              `/assets/${filename}.webp`,
              function(tex) {
                tex.colorSpace = THREE.SRGBColorSpace;
                const artMaterial = new THREE.MeshBasicMaterial({
                  map: tex,
                  side: THREE.DoubleSide
                });
                placeArtFrameOnWallWithMaterial(tryWall, artMaterial, frameWidth, frameHeight, tryPos.x, tryPos.y);
                loadedCount++;
                console.log(`Placed NFT ${loadedCount}/${nftFiles.length}: ${filename}`);
                setTimeout(() => loadAndPlaceNFT(index + 1), 30);
              },
              undefined,
              function(error) {
                console.error(`Error loading NFT texture ${filename}:`, error);
                setTimeout(() => loadAndPlaceNFT(index + 1), 30);
              }
            );
            placed = true;
            break;
          }
        }
        if (!placed) {
          console.warn(`Could not place NFT ${index + 1}: ${filename}`);
          setTimeout(() => loadAndPlaceNFT(index + 1), 30);
        }
      }
    };

    img.onerror = function() {
      console.error(`Error loading image dimensions for ${filename}`);
      setTimeout(() => loadAndPlaceNFT(index + 1), 30);
    };

    // Start loading the image to get dimensions
    img.src = `/assets/${filename}.webp`;
  }

  // Start loading NFTs (multiple concurrent loaders for faster loading)
  const CONCURRENT_LOADERS = 4;
  for (let i = 0; i < CONCURRENT_LOADERS; i++) {
    setTimeout(() => loadAndPlaceNFT(i * Math.ceil(nftFiles.length / CONCURRENT_LOADERS)), i * 100);
  }

  // STEP 3: Start loading copper textures (they run in parallel)
  loadCopperBatch(0);

  // STEP 4: Place copper tiles in remaining spaces (after NFT positions are reserved)

  // Define copper tile dimensions
  const tileWidth = 3.5;
  const tileHeight = 3.5;
  const phi = 1.618033988749895; // Golden ratio for reference
  
  // Calculate the number of copper tiles per wall (many more than NFTs)
  const maxCopperTilesPerWall = 80; // Increased number for better filling
  
  // For each wall type, place copper tiles
  wallTypes.forEach(wallType => {
    let tilesPlaced = 0;
    let consecutiveFailures = 0;
    
    while (tilesPlaced < maxCopperTilesPerWall && consecutiveFailures < 50) {
      // Randomly vary the tile size
      const randomScale = 0.3 + Math.random() * 1.2;
      let aspectRatio = 1.0;
      
      // Select a shape type
      const shapeType = Math.floor(Math.random() * 3);
      let actualWidth, actualHeight;
      
      switch(shapeType) {
        case 0: // Square
          actualWidth = tileWidth * randomScale;
          actualHeight = tileHeight * randomScale;
          break;
        case 1: // Wider
          actualWidth = tileWidth * randomScale * 1.2;
          actualHeight = tileHeight * randomScale * 0.8;
          aspectRatio = 1.5;
          break;
        case 2: // Taller
          actualWidth = tileWidth * randomScale * 0.8;
          actualHeight = tileHeight * randomScale * 1.2;
          aspectRatio = 0.75;
          break;
      }
      
      // Randomize vertical position more freely now
      const position = findUnoccupiedPosition(wallType, actualWidth, actualHeight, 1, roomHeight - 1);
      
      if (position) {
        // Place copper tile
        placeCopperTileOnWall(
          wallType,
          copperMaterials,
          actualWidth,
          actualHeight,
          position.x,
          position.y,
          aspectRatio
        );
        
        tilesPlaced++;
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
      }
    }
    
    console.log(`Placed ${tilesPlaced} copper tiles on ${wallType} wall`);
  });
}

// Function to place an art frame with a pre-created material (for progressive loading)
function placeArtFrameOnWallWithMaterial(wallType, artMaterial, frameWidth, frameHeight, xPosition, yPosition) {
  // Determine the wall position and orientation
  let wallX, wallZ, rotationY;

  switch(wallType) {
    case 'front':
      wallX = 0;
      wallZ = roomLength/2 - 0.3;
      rotationY = 0;
      break;
    case 'back':
      wallX = 0;
      wallZ = -roomLength/2 + 0.3;
      rotationY = Math.PI;
      break;
    case 'left':
      wallX = -roomWidth/2 + 0.3;
      wallZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallX = roomWidth/2 - 0.3;
      wallZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }

  // Calculate the final position based on wall orientation
  let finalX, finalZ;

  if (wallType === 'front' || wallType === 'back') {
    finalX = xPosition;
    finalZ = 0;
  } else {
    finalX = 0;
    finalZ = xPosition;
  }

  // Create frame backing
  const frameBackGeometry = new THREE.BoxGeometry(frameWidth + 0.8, frameHeight + 0.8, 0.2);
  const frameBackMat = new THREE.MeshStandardMaterial({
    color: 0x332211,
    roughness: 0.8,
    metalness: 0.2
  });
  const frameBack = new THREE.Mesh(frameBackGeometry, frameBackMat);
  frameBack.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  frameBack.rotation.y = rotationY;
  frameBack.castShadow = true;
  scene.add(frameBack);

  // Create actual artwork with the provided material
  const artGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight);
  const artwork = new THREE.Mesh(artGeometry, artMaterial);

  // Position just in front of the frame backing
  // Increased from 0.15 to 0.5 to ensure NFTs render in front of copper tiles (which are at 0.25)
  let artOffset = 0.5;
  let zOffset = 0, xOffset = 0;

  if (rotationY === 0) {
    zOffset = -artOffset;
  } else if (rotationY === Math.PI) {
    zOffset = artOffset;
  } else if (rotationY === Math.PI / 2) {
    xOffset = artOffset;
  } else if (rotationY === -Math.PI / 2) {
    xOffset = -artOffset;
  }

  artwork.position.set(wallX + finalX + xOffset, yPosition, wallZ + finalZ + zOffset);

  if (rotationY === Math.PI / 2 || rotationY === -Math.PI / 2) {
    artwork.rotation.y = rotationY + Math.PI;
  } else {
    artwork.rotation.y = rotationY;
  }

  scene.add(artwork);

  // Add spotlight
  const spotLight = new THREE.SpotLight(0xffffff, 0.3, 30, Math.PI/8, 0.8, 1);

  if (rotationY === 0) {
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ + 8);
  } else if (rotationY === Math.PI) {
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ - 8);
  } else if (rotationY === Math.PI / 2) {
    spotLight.position.set(wallX + finalX - 8, yPosition + 5, wallZ + finalZ);
  } else if (rotationY === -Math.PI / 2) {
    spotLight.position.set(wallX + finalX + 8, yPosition + 5, wallZ + finalZ);
  }

  spotLight.target.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  scene.add(spotLight);
  scene.add(spotLight.target);
}

// Function to place an art frame on a specific wall (legacy - used by copper tiles)
function placeArtFrameOnWall(wallType, texture, dimensions, frameWidth, frameHeight, xPosition, yPosition) {
  // Determine the wall position and orientation
  let wallX, wallZ, rotationY;

  switch(wallType) {
    case 'front':
      wallX = 0;
      wallZ = roomLength/2 - 0.3;
      rotationY = 0;
      break;
    case 'back':
      wallX = 0;
      wallZ = -roomLength/2 + 0.3;
      rotationY = Math.PI;
      break;
    case 'left':
      wallX = -roomWidth/2 + 0.3;
      wallZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallX = roomWidth/2 - 0.3;
      wallZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }

  // Calculate the final position based on wall orientation
  let finalX, finalZ;

  if (wallType === 'front' || wallType === 'back') {
    finalX = xPosition;
    finalZ = 0;
  } else { // left or right
    finalX = 0;
    finalZ = xPosition; // Use xPosition as z-coordinate for side walls
  }

  // Create frame backing
  const frameBackGeometry = new THREE.BoxGeometry(frameWidth + 0.8, frameHeight + 0.8, 0.2);
  const frameBackMaterial = new THREE.MeshStandardMaterial({
    color: 0x332211, // Dark wood color
    roughness: 0.8,
    metalness: 0.2
  });
  const frameBack = new THREE.Mesh(frameBackGeometry, frameBackMaterial);
  frameBack.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  frameBack.rotation.y = rotationY;
  frameBack.castShadow = true;
  scene.add(frameBack);
  
  // Create actual artwork
  const artGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight);
  const artMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide // Allow viewing from both sides to be safe
  });
  const artwork = new THREE.Mesh(artGeometry, artMaterial);
  
  // Position just in front of the frame backing
  // Increased from 0.15 to 0.5 to ensure NFTs render in front of copper tiles (which are at 0.25)
  let artOffset = 0.5;
  let zOffset = 0, xOffset = 0;
  
  // Calculate offset direction based on wall orientation
  // Ensure artwork faces inward for all walls
  if (rotationY === 0) { // Front wall
    zOffset = -artOffset; // Offset toward room center
  } else if (rotationY === Math.PI) { // Back wall
    zOffset = artOffset; // Offset toward room center
  } else if (rotationY === Math.PI / 2) { // Left wall
    xOffset = artOffset; // Offset toward room center
  } else if (rotationY === -Math.PI / 2) { // Right wall
    xOffset = -artOffset; // Offset toward room center
  }
  
  artwork.position.set(wallX + finalX + xOffset, yPosition, wallZ + finalZ + zOffset);
  
  // Set artwork rotation to face inward for all walls
  // For left and right walls, we need to adjust the rotation by 180 degrees
  if (rotationY === Math.PI / 2) { // Left wall
    artwork.rotation.y = rotationY + Math.PI; // Add 180 degrees to face inward
  } else if (rotationY === -Math.PI / 2) { // Right wall
    artwork.rotation.y = rotationY + Math.PI; // Add 180 degrees to face inward
  } else {
  artwork.rotation.y = rotationY;
  }
  
  scene.add(artwork);
  
  // Add a subtle spotlight to illuminate the artwork
  const spotLight = new THREE.SpotLight(0xffffff, 0.3, 30, Math.PI/8, 0.8, 1);
  
  // Adjust spotlight position to shine toward the artwork from inside the room
  if (rotationY === 0) { // Front wall
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ + 8); // Position inside room
  } else if (rotationY === Math.PI) { // Back wall
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ - 8); // Position inside room
  } else if (rotationY === Math.PI / 2) { // Left wall
    spotLight.position.set(wallX + finalX - 8, yPosition + 5, wallZ + finalZ); // Position inside room
  } else if (rotationY === -Math.PI / 2) { // Right wall
    spotLight.position.set(wallX + finalX + 8, yPosition + 5, wallZ + finalZ); // Position inside room
  }
  
  spotLight.target.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  scene.add(spotLight);
  scene.add(spotLight.target);
}

// Function to place a copper tile on a specific wall
function placeCopperTileOnWall(wallType, materials, tileWidth, tileHeight, xPosition, yPosition, aspectRatio) {
  // Determine the wall position and orientation
  let wallX, wallZ, rotationY;
  const wallOffset = 0.25;
  
  switch(wallType) {
    case 'front':
      wallX = 0;
      wallZ = roomLength/2 - wallOffset;
      rotationY = 0;
      break;
    case 'back':
      wallX = 0;
      wallZ = -roomLength/2 + wallOffset;
      rotationY = Math.PI;
      break;
    case 'left':
      wallX = -roomWidth/2 + wallOffset;
      wallZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallX = roomWidth/2 - wallOffset;
      wallZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }
  
  // Calculate the final position based on wall orientation
  let finalX, finalZ;
  
  if (wallType === 'front' || wallType === 'back') {
    finalX = xPosition;
    finalZ = 0;
  } else { // left or right
    finalX = 0;
    finalZ = xPosition; // Use xPosition as z-coordinate for side walls
  }
  
  // Select a random copper material
  const randomMaterialIndex = Math.floor(Math.random() * materials.length);
  const selectedMaterial = materials[randomMaterialIndex].clone();
  
  // Enhance material settings to make tiles more visible
  selectedMaterial.roughness = 0.4; // More shiny
  selectedMaterial.metalness = 0.9; // More metallic
  selectedMaterial.emissive = new THREE.Color(0x331100); // Subtle glow
  selectedMaterial.emissiveIntensity = 0.15;
  
  // Create tile geometry
  const tileGeometry = new THREE.BoxGeometry(tileWidth, tileHeight, 0.1);
  const tile = new THREE.Mesh(tileGeometry, selectedMaterial);
  
  // Position tile with small random depth variation
  const depthVariation = (Math.random() * 0.1) + 0.05;
  
  // Position based on wall type
  if (wallType === 'front') {
    tile.position.set(wallX + finalX, yPosition, wallZ - depthVariation);
    tile.rotation.y = Math.PI; // Face inward
  } else if (wallType === 'back') {
    tile.position.set(wallX + finalX, yPosition, wallZ + depthVariation);
    tile.rotation.y = 0; // Face inward
  } else if (wallType === 'left') {
    tile.position.set(wallX + depthVariation, yPosition, wallZ + finalZ);
    tile.rotation.y = -Math.PI / 2; // Face inward
  } else if (wallType === 'right') {
    tile.position.set(wallX - depthVariation, yPosition, wallZ + finalZ);
    tile.rotation.y = Math.PI / 2; // Face inward
  }
  
  // Subtle random rotation for variety, but not too much
  tile.rotation.z = (Math.random() - 0.5) * 0.2;
  tile.rotation.x = (Math.random() - 0.5) * 0.2;
  
  tile.castShadow = true;
  tile.receiveShadow = true;
  scene.add(tile);
  
  // Add a very subtle point light near some tiles for additional highlights
  if (Math.random() > 0.8) { // Only 20% of tiles get lights
    const tileLight = new THREE.PointLight(0xffccaa, 0.2, 10);
    tileLight.position.copy(tile.position);
    
    // Move light slightly toward room center
    if (wallType === 'front') {
      tileLight.position.z -= 2;
    } else if (wallType === 'back') {
      tileLight.position.z += 2;
    } else if (wallType === 'left') {
      tileLight.position.x += 2;
    } else if (wallType === 'right') {
      tileLight.position.x -= 2;
    }
    
    scene.add(tileLight);
  }
}

function createLighting() {
  // Ambient light - increased intensity for larger room
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Brighter ambient light for better artwork visibility
  scene.add(ambientLight);
  
  // Main directional light (sunlight) - repositioned for larger room
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(60, 80, 60);
  directionalLight.castShadow = true;
  
  // Optimize shadows for larger room
  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 300;
  directionalLight.shadow.camera.left = -150;
  directionalLight.shadow.camera.right = 150;
  directionalLight.shadow.camera.top = 150;
  directionalLight.shadow.camera.bottom = -150;
  directionalLight.shadow.bias = -0.0005;
  scene.add(directionalLight);
  
  // Additional point lights for better illumination in corners
  const pointLight1 = new THREE.PointLight(0xffffff, 0.7, 150);
  pointLight1.position.set(30, 40, 30);
  pointLight1.castShadow = true;
  // Optimize shadows for point light
  pointLight1.shadow.mapSize.width = 1024;
  pointLight1.shadow.mapSize.height = 1024;
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 120);
  pointLight2.position.set(-40, 25, -40);
  pointLight2.castShadow = true;
  pointLight2.shadow.mapSize.width = 1024;
  pointLight2.shadow.mapSize.height = 1024;
  scene.add(pointLight2);
  
  // Add colored accent lighting for visual interest
  const blueLight = new THREE.PointLight(0x0044ff, 0.3, 100);
  blueLight.position.set(-roomWidth * 0.3, 20, roomLength * 0.3);
  scene.add(blueLight);
  
  const purpleLight = new THREE.PointLight(0x8800ff, 0.3, 100);
  purpleLight.position.set(roomWidth * 0.3, 15, roomLength * 0.3);
  scene.add(purpleLight);
  
  // Gallery lighting - soft warm light
  const galleryLight1 = new THREE.PointLight(0xffe3c0, 0.4, 100);
  galleryLight1.position.set(0, roomHeight * 0.7, 0);
  scene.add(galleryLight1);
  
  const galleryLight2 = new THREE.PointLight(0xffe3c0, 0.4, 100);
  galleryLight2.position.set(-roomWidth * 0.25, roomHeight * 0.7, -roomLength * 0.25);
  scene.add(galleryLight2);
  
  const galleryLight3 = new THREE.PointLight(0xffe3c0, 0.4, 100);
  galleryLight3.position.set(roomWidth * 0.25, roomHeight * 0.7, roomLength * 0.25);
  scene.add(galleryLight3);
}

// ----------------------------------------------------------------------
// Create Hidden Hole Portal back to Room 0 (Ocean Room)
// A mysterious hole in the floor - walk into it and fall back to the ocean
// ----------------------------------------------------------------------
const holePosition = { x: roomWidth/2 - 15, z: roomLength/2 - 15 };
const holeRadius = 4;
const fallDepthToTeleport = 30; // How far to fall before triggering teleport
let isFallingInHole = false;
let fallStartY = 0;
let teleportTriggered = false;

function createHolePortal() {
  // Create a dark pit/hole in the floor
  // The hole is a cylinder going down with dark interior

  // Create the hole rim (a ring around the hole)
  const rimGeometry = new THREE.RingGeometry(holeRadius, holeRadius + 0.5, 32);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(holePosition.x, groundLevel + 0.02, holePosition.z);
  scene.add(rim);

  // Create the dark pit interior (a cylinder going down)
  const pitDepth = 100; // Visual depth of the pit
  const pitGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, pitDepth, 32, 1, true);
  const pitMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide // Render inside of cylinder
  });
  const pit = new THREE.Mesh(pitGeometry, pitMaterial);
  pit.position.set(holePosition.x, groundLevel - pitDepth/2, holePosition.z);
  scene.add(pit);

  // Add a subtle dark glow around the hole
  const glowGeometry = new THREE.RingGeometry(holeRadius + 0.5, holeRadius + 2, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x002233, // Slight cyan tint for ocean destination
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(holePosition.x, groundLevel + 0.01, holePosition.z);
  scene.add(glow);

  // Add dim light inside the pit for mysterious effect
  const pitLight = new THREE.PointLight(0x003344, 0.3, 50);
  pitLight.position.set(holePosition.x, groundLevel - 10, holePosition.z);
  scene.add(pitLight);

  console.log('Created hidden hole portal at', holePosition.x, holePosition.z);
}

// ----------------------------------------------------------------------
// Check if Player is Over the Hole
// ----------------------------------------------------------------------
function isOverHole() {
  const dx = camera.position.x - holePosition.x;
  const dz = camera.position.z - holePosition.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  return distance < holeRadius;
}

// ----------------------------------------------------------------------
// Handle Falling Through Hole
// ----------------------------------------------------------------------
function handleHoleFalling(delta) {
  if (teleportTriggered) return;

  if (isOverHole()) {
    if (!isFallingInHole) {
      // Start falling into the hole
      isFallingInHole = true;
      fallStartY = camera.position.y;
      isJumping = true; // Use the existing jump/fall system
      jumpVelocity = 0; // Start with no velocity, gravity will pull down
      console.log('Falling into the hole...');
    }

    // Check if we've fallen far enough to trigger teleport
    const fallDistance = fallStartY - camera.position.y;
    if (fallDistance > fallDepthToTeleport && !teleportTriggered) {
      teleportTriggered = true;
      console.log('Teleporting to Ocean Room after falling', fallDistance.toFixed(1), 'units');

      // Show loading screen
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
      }

      // Teleport after a short delay
      setTimeout(() => {
        window.location.href = 'room0.html';
      }, 500);
    }
  }
}

// ----------------------------------------------------------------------
// Initialize Scene
// ----------------------------------------------------------------------
function initializeRoom() {
  console.log("Initializing Room B2 (Gallery Room)...");

  // Create the basic room structure
  console.log("Creating room structure and mixed decorations...");
  createBasicRoom();

  // Create hidden hole portal back to Room 0 (Ocean Room)
  console.log("Creating hidden hole portal to Ocean Room...");
  createHolePortal();
  
  // Load GLB model
  console.log("Loading GLB model...");
  loadGLBModel();
  
  // Start the animation loop
  console.log("Starting animation loop...");
  animate();
  
  console.log("Room initialization complete!");
}

// ----------------------------------------------------------------------
// Load GLB Model
// ----------------------------------------------------------------------
function loadGLBModel() {
  const loader = new GLTFLoader();
  
  // Show loading progress
  const loadingManager = new THREE.LoadingManager();
  
  loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    console.log(`Loading model: ${Math.round(itemsLoaded / itemsTotal * 100)}%`);
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      const loadingBar = loadingOverlay.querySelector('.loading-bar');
      if (loadingBar) {
        loadingBar.style.width = `${Math.round(itemsLoaded / itemsTotal * 100)}%`;
      }
    }
  };
  
  loadingManager.onLoad = function() {
    console.log("All models loaded successfully");
    modelLoaded = true;
    
    // Hide loading overlay when everything is loaded
    setTimeout(() => {
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 500);
      }
    }, 500);
  };
  
  loadingManager.onError = function(url) {
    console.error('Error loading:', url);
    modelLoadingError = true;
    
    // Even if loading fails, hide the overlay after a delay
    setTimeout(() => {
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }, 2000);
  };
  
  // Use a loading manager with the GLTFLoader
  const gltfLoader = new GLTFLoader(loadingManager);
  
  // Load the model
  gltfLoader.load(
    // Path to your GLB file
    '/assets/aviary_gallery.glb',
    
    // On successful load
    function(gltf) {
      loadedModel = gltf.scene;
      
      // Scale the model to fit the room 
      loadedModel.scale.set(10, 10, 10);
      
      // Position the model in the center of the room
      loadedModel.position.set(
        0,  // Center X
        1,  // Just above the floor
        0   // Center Z
      );
      
      // Make sure the model casts and receives shadows
      loadedModel.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // Optional: If materials need adjustments
          if (node.material) {
            node.material.roughness = 0.7; // Less shiny
            node.material.metalness = 0.3; // Less metallic
          }
        }
      });
      
      // Add the model to the scene
      scene.add(loadedModel);
      console.log('GLB model loaded successfully');
    },
    
    // On loading progress
    function(xhr) {
      console.log(`Model ${xhr.loaded / xhr.total * 100}% loaded`);
    },
    
    // On error
    function(error) {
      console.error('An error occurred loading the GLB model:', error);
      
      // Even if this specific model fails, allow the scene to be shown
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }
  );
}

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  
  // Update the mirror ceiling reflection
  if (mirrorCubeCamera && ceilingMirror) {
    // Hide the ceiling temporarily to prevent it from being in its own reflection
    ceilingMirror.visible = false;
    
    // Update the cube camera render target
    mirrorCubeCamera.update(renderer, scene);
    
    // Make the ceiling visible again
    ceilingMirror.visible = true;
  }
  
  if (controls.isLocked) {
    // Get player object (camera parent in PointerLockControls)
    const player = controls.getObject();
    const delta = clock.getDelta();

    // Get time delta for smooth movement
    const speedDelta = speed * delta;

    // Apply movement in the direction the camera is facing
    if (moveForward) {
      controls.moveForward(speedDelta);
    }
    if (moveBackward) {
      controls.moveForward(-speedDelta);
    }
    if (moveLeft) {
      controls.moveRight(-speedDelta);
    }
    if (moveRight) {
      controls.moveRight(speedDelta);
    }

    // Handle jumping and gravity with hover zone near ceiling (use player.position)
    if (isJumping) {
      // Apply hover gravity when near ceiling, normal gravity otherwise
      const currentGravity = player.position.y >= hoverZoneHeight ? hoverGravity : gravity;
      jumpVelocity += currentGravity * delta;

      // Update position based on velocity
      let newY = player.position.y + jumpVelocity * delta;

      // Ceiling collision - bounce off
      if (newY >= roomHeight - eyeHeight) {
        newY = roomHeight - eyeHeight;
        jumpVelocity = -jumpVelocity * bounceCoefficient; // Bounce down
      }

      // Ground collision - but allow falling through the hole
      if (newY <= groundLevel + eyeHeight) {
        if (isOverHole() && isFallingInHole) {
          // Allow falling through the hole - no ground collision
          // Keep falling
        } else {
          // Normal ground collision
          newY = groundLevel + eyeHeight;
          isJumping = false;
          jumpVelocity = 0;
          isFallingInHole = false; // Reset hole falling state
        }
      }

      player.position.y = newY;
    }

    // Handle falling through the hole
    handleHoleFalling(delta);

    // Add boundary check to keep player inside the room
    const boundaryBuffer = 2;

    // Keep X position inside room boundaries
    if (player.position.x < -roomWidth/2 + boundaryBuffer) {
      player.position.x = -roomWidth/2 + boundaryBuffer;
    } else if (player.position.x > roomWidth/2 - boundaryBuffer) {
      player.position.x = roomWidth/2 - boundaryBuffer;
    }

    // Keep Z position inside room boundaries
    if (player.position.z < -roomLength/2 + boundaryBuffer) {
      player.position.z = -roomLength/2 + boundaryBuffer;
    } else if (player.position.z > roomLength/2 - boundaryBuffer) {
      player.position.z = roomLength/2 - boundaryBuffer;
    }
  }
  
  // Render the scene
  renderer.render(scene, camera);
}

// ----------------------------------------------------------------------
// Fix for loading screen and initialization
// ----------------------------------------------------------------------
window.addEventListener('load', () => {
  console.log("Window loaded, initializing room...");
  
  // Add a listener for the loading overlay to ensure it can be shown/hidden
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    console.log("Loading overlay found, ensuring it's visible during loading");
    loadingOverlay.style.display = 'flex';
  } else {
    console.error("Loading overlay element not found in the HTML");
  }
  
  // Initialize the room after a short delay
setTimeout(() => {
  try {
      initializeRoom();
  } catch(e) {
    console.error("Failed to initialize room:", e);
      // Hide loading overlay even if initialization fails
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }
  }, 500);
});

// Add error handler to ensure loading overlay is hidden if there's an error
window.addEventListener('error', function(event) {
  console.error('Error caught:', event.error || event.message);
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
});

// Initial camera position - raised height
camera.position.set(0, groundLevel + eyeHeight, 0);
camera.lookAt(0, groundLevel + eyeHeight, 10);

// Click handler to lock controls
window.addEventListener('click', () => {
  if (!controls.isLocked) {
    controls.lock();
  }
}); 