import { Vector3D } from "@classes/vector3d";

export async function rotateBundleGPU(points: Vector3D[], O: Vector3D, u: Vector3D, ang: number) {
  if (!navigator.gpu) {
    console.log("NO GPU");
    return [];
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();

  if (!device) {
    console.log("NO DEVICE");
    return [];
  }

  const shaderCode = /*wgsl*/ `
    @group(0) @binding(0) var<storage, read_write> bufferData: array<f32>;
    @group(0) @binding(1) var<storage, read_write> params: array<f32>;

    @compute @workgroup_size(32)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      let index = id.x * 3;
      let p = vec3f(bufferData[index], bufferData[index + 1u], bufferData[index + 2u]);
      let u = normalize(vec3f(params[0], params[1], params[2]));
      let O = vec3f(params[3], params[4], params[5]);
      let halfAngle = params[6] * 0.5;
      let s = sin(halfAngle);
      let qx = u.x * s;
      let qy = u.y * s;
      let qz = u.z * s;
      let qw = cos(halfAngle);

      let px = p.x - O.x;
      let py = p.y - O.y;
      let pz = p.z - O.z;

      let tx = 2.0 * (qy * pz - qz * py);
      let ty = 2.0 * (qz * px - qx * pz);
      let tz = 2.0 * (qx * py - qy * px);

      bufferData[index] = px + qw * tx + qy * tz - qz * ty + O.x;
      bufferData[index + 1] = py + qw * ty + qz * tx - qx * tz + O.y;
      bufferData[index + 2] = pz + qw * tz + qx * ty - qy * tx + O.z;
    }
  `;

  // Layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
          hasDynamicOffset: false,
          minBindingSize: 0,
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
          hasDynamicOffset: false,
          minBindingSize: 0,
        },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // Compute pipeline
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module: device.createShaderModule({
        code: shaderCode, // El código WGSL de arriba
      }),
      entryPoint: "main",
    },
  });

  // Point buffer
  const pointsBuffer = device.createBuffer({
    size: points.length * 3 * 4, // 3 floats por punto
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });

  device.queue.writeBuffer(pointsBuffer, 0, new Float32Array(points.flatMap(p => [p.x, p.y, p.z])));

  // Params buffer
  const paramsBuffer = device.createBuffer({
    size: 7 * 4, // 7 floats para el eje, centro y ángulo
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });

  device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([u.x, u.y, u.z, O.x, O.y, O.z, ang]));

  // Result buffer
  const resultBuffer = device.createBuffer({
    size: points.length * 3 * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: pointsBuffer } },
      { binding: 1, resource: { buffer: paramsBuffer } },
    ],
  });

  // Shader execution
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(points.length); // Num threads = num points
  passEncoder.end();

  commandEncoder.copyBufferToBuffer(pointsBuffer, 0, resultBuffer, 0, resultBuffer.size);
  device.queue.submit([commandEncoder.finish()]);

  await resultBuffer.mapAsync(GPUMapMode.READ);
  const resultArray = new Float32Array(resultBuffer.getMappedRange());

  const rotatedPoints = [];
  for (let i = 0, maxi = resultArray.length; i < maxi; i += 3) {
    rotatedPoints.push(new Vector3D(resultArray[i], resultArray[i + 1], resultArray[i + 2]));
  }

  resultBuffer.unmap();

  return rotatedPoints;
}
