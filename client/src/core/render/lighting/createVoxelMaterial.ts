import * as THREE from 'three';

type ShaderLike = {
  uniforms: Record<string, { value: number }>;
  vertexShader: string;
  fragmentShader: string;
};

type VoxelMaterialOptions = {
  alphaTest?: number;
};

type VoxelMaterialUserData = {
  voxelFullBrightUniform?: { value: number };
};

export function createVoxelMaterial(
  texture: THREE.Texture,
  { alphaTest = 0 }: VoxelMaterialOptions = {}
): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    alphaTest
  });
  const userData = material.userData as VoxelMaterialUserData;
  userData.voxelFullBrightUniform = { value: 0 };

  material.onBeforeCompile = (shader: ShaderLike) => {
    shader.uniforms.voxelFullBright = userData.voxelFullBrightUniform ?? { value: 0 };
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute vec2 lightmap;\nattribute vec4 tilemap;\nvarying vec2 vLightmap;\nvarying vec4 vTilemap;'
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\nvLightmap = lightmap;\nvTilemap = tilemap;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nuniform float voxelFullBright;\nvarying vec2 vLightmap;\nvarying vec4 vTilemap;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#ifdef USE_MAP\nvec2 tiledUv = clamp(fract(vMapUv), vec2(0.001), vec2(0.999));\nvec2 atlasUv = mix(vTilemap.xy, vTilemap.zw, tiledUv);\nvec4 sampledDiffuseColor = texture2D(map, atlasUv);\n#ifdef DECODE_VIDEO_TEXTURE\nsampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);\n#endif\ndiffuseColor *= sampledDiffuseColor;\n#endif\nfloat skyLight = clamp(vLightmap.x, 0.0, 1.0);\nfloat blockLight = clamp(vLightmap.y, 0.0, 1.0);\nfloat bakedLightStrength = clamp(0.42 + skyLight * 0.58 + blockLight * 0.95, 0.25, 2.0);\nfloat fullBrightStrength = 1.1 + blockLight * 0.2;\nfloat lightStrength = mix(bakedLightStrength, fullBrightStrength, clamp(voxelFullBright, 0.0, 1.0));\ndiffuseColor.rgb *= lightStrength;'
    );
  };
  material.customProgramCacheKey = () => 'voxel-material-v2';

  return material;
}

export function setVoxelMaterialFullBright(
  material: THREE.MeshLambertMaterial,
  enabled: boolean
): void {
  const userData = material.userData as VoxelMaterialUserData;
  const uniform = userData.voxelFullBrightUniform;
  if (uniform) uniform.value = enabled ? 1 : 0;
}
