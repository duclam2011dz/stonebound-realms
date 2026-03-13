import * as THREE from 'three';

export function createVoxelMaterial(texture) {
  const material = new THREE.MeshLambertMaterial({
    map: texture
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute vec2 lightmap;\nvarying vec2 vLightmap;'
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\nvLightmap = lightmap;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec2 vLightmap;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\nfloat skyLight = clamp(vLightmap.x, 0.0, 1.0);\nfloat blockLight = clamp(vLightmap.y, 0.0, 1.0);\nfloat lightStrength = clamp(0.42 + skyLight * 0.58 + blockLight * 0.95, 0.25, 2.0);\ndiffuseColor.rgb *= lightStrength;'
    );
  };

  return material;
}
