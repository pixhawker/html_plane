module.exports = "@export ecgl.ssao.estimate\n\nuniform sampler2D depthTex;\n\nuniform sampler2D normalTex;\n\nuniform sampler2D noiseTex;\n\nuniform vec2 depthTexSize;\n\nuniform vec2 noiseTexSize;\n\nuniform mat4 projection;\n\nuniform mat4 projectionInv;\n\nuniform mat4 viewInverseTranspose;\n\nuniform vec3 kernel[KERNEL_SIZE];\n\nuniform float radius : 1;\n\nuniform float power : 1;\n\nuniform float bias: 1e-2;\n\nuniform float intensity: 1.0;\n\nvarying vec2 v_Texcoord;\n\nfloat ssaoEstimator(in vec3 originPos, in mat3 kernelBasis) {\n float occlusion = 0.0;\n\n for (int i = 0; i < KERNEL_SIZE; i++) {\n vec3 samplePos = kernel[i];\n#ifdef NORMALTEX_ENABLED\n samplePos = kernelBasis * samplePos;\n#endif\n samplePos = samplePos * radius + originPos;\n\n vec4 texCoord = projection * vec4(samplePos, 1.0);\n texCoord.xy /= texCoord.w;\n\n vec4 depthTexel = texture2D(depthTex, texCoord.xy * 0.5 + 0.5);\n\n float sampleDepth = depthTexel.r * 2.0 - 1.0;\n\n sampleDepth = projection[3][2] / (sampleDepth * projection[2][3] - projection[2][2]);\n\n float rangeCheck = smoothstep(0.0, 1.0, radius / abs(originPos.z - sampleDepth));\n occlusion += rangeCheck * step(samplePos.z, sampleDepth - bias);\n }\n#ifdef NORMALTEX_ENABLED\n occlusion = 1.0 - occlusion / float(KERNEL_SIZE);\n#else\n occlusion = 1.0 - clamp((occlusion / float(KERNEL_SIZE) - 0.6) * 2.5, 0.0, 1.0);\n#endif\n return pow(occlusion, power);\n}\n\nvoid main()\n{\n\n vec4 depthTexel = texture2D(depthTex, v_Texcoord);\n\n#ifdef NORMALTEX_ENABLED\n vec4 tex = texture2D(normalTex, v_Texcoord);\n if (dot(tex.rgb, tex.rgb) == 0.0) {\n gl_FragColor = vec4(1.0);\n return;\n }\n vec3 N = tex.rgb * 2.0 - 1.0;\n N = (viewInverseTranspose * vec4(N, 0.0)).xyz;\n\n vec2 noiseTexCoord = depthTexSize / vec2(noiseTexSize) * v_Texcoord;\n vec3 rvec = texture2D(noiseTex, noiseTexCoord).rgb * 2.0 - 1.0;\n vec3 T = normalize(rvec - N * dot(rvec, N));\n vec3 BT = normalize(cross(N, T));\n mat3 kernelBasis = mat3(T, BT, N);\n#else\n if (depthTexel.r > 0.99999) {\n gl_FragColor = vec4(1.0);\n return;\n }\n mat3 kernelBasis;\n#endif\n\n float z = depthTexel.r * 2.0 - 1.0;\n\n vec4 projectedPos = vec4(v_Texcoord * 2.0 - 1.0, z, 1.0);\n vec4 p4 = projectionInv * projectedPos;\n\n vec3 position = p4.xyz / p4.w;\n\n float ao = ssaoEstimator(position, kernelBasis);\n ao = clamp(1.0 - (1.0 - ao) * intensity, 0.0, 1.0);\n gl_FragColor = vec4(vec3(ao), 1.0);\n}\n\n@end\n\n\n@export ecgl.ssao.blur\n\nuniform sampler2D ssaoTexture;\n\nuniform vec2 textureSize;\n\nvarying vec2 v_Texcoord;\n\nvoid main ()\n{\n\n vec2 texelSize = 1.0 / textureSize;\n\n float ao = 0.0;\n vec2 hlim = vec2(float(-BLUR_SIZE) * 0.5 + 0.5);\n float centerAo = texture2D(ssaoTexture, v_Texcoord).r;\n float weightAll = 0.0;\n float boxWeight = 1.0 / float(BLUR_SIZE) * float(BLUR_SIZE);\n for (int x = 0; x < BLUR_SIZE; x++) {\n for (int y = 0; y < BLUR_SIZE; y++) {\n vec2 coord = (vec2(float(x), float(y)) + hlim) * texelSize + v_Texcoord;\n float sampleAo = texture2D(ssaoTexture, coord).r;\n float closeness = 1.0 - distance(sampleAo, centerAo) / sqrt(3.0);\n float weight = boxWeight * closeness;\n ao += weight * sampleAo;\n weightAll += weight;\n }\n }\n\n gl_FragColor = vec4(vec3(clamp(ao / weightAll, 0.0, 1.0)), 1.0);\n}\n@end";