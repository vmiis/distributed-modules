"use strict";
{
	// particles class
	class Particle {
		constructor(k, i, j) {
			this.i = i;
			this.j = j;
			this.init();
			this.P = 1;
			this.p = 0;
			this.pos = posArray.subarray(k * 3, k * 3 + 3);
		}
		init() {
			this.x0  = this.i * (canvas.width / resX);
			this.y0  = this.j * (canvas.height / resY);
		}
		move(x, y) {
			const dx = this.x0 - x;
			const dy = this.y0 - y;
			const d  = 3.0 / Math.exp(Math.sqrt(dx * dx + dy * dy) / 200);
			this.P += (this.p += ((d - this.P) * 1.0 - this.p) * .0005);
			// update buffer position
			this.pos[0] = dx * this.P;
			this.pos[1] = dy * this.P;
			this.pos[2] = d;
		}
	}
	// webGL canvas
	const canvas = {
		init(options) {
			// set webGL context
			this.elem = document.querySelector("canvas");
			const gl = (this.gl =
				this.elem.getContext("webgl", options) ||
				this.elem.getContext("experimental-webgl", options));
			if (!gl) return false;
			// compile shaders
			const vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(
				vertexShader,
				`
					precision highp float;
					attribute vec3 aPosition;
					uniform vec2 uResolution;
					varying float dist;
					void main() {
						dist = aPosition.z * 0.3;
						gl_PointSize = 3.0;
						gl_Position = vec4(
							( (uResolution.x * 0.5 + aPosition.x) / uResolution.x * 2.0) - 1.0, 
							( (-uResolution.y * 0.5 -aPosition.y) / uResolution.y * 2.0) + 1.0, 
							0.0,
							1.0
						);
					}
      	`
			);
			gl.compileShader(vertexShader);
			const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(
				fragmentShader,
				`
					precision highp float;
					varying float dist;
					void main() {
						vec2 pc = 2.0 * gl_PointCoord - 1.0;
						gl_FragColor = vec4(dist * 9.0, dist * 6.0, 0.2 + dist * 2.0, 1.0 - dot(pc, pc));
					}
				`
			);
			gl.compileShader(fragmentShader);
			const program = (this.program = gl.createProgram());
			gl.attachShader(this.program, vertexShader);
			gl.attachShader(this.program, fragmentShader);
			gl.linkProgram(this.program);
			gl.useProgram(this.program);
			// resolution
			this.uResolution = gl.getUniformLocation(this.program, "uResolution");
			gl.enableVertexAttribArray(this.uResolution);
			// canvas resize
			this.resize();
			window.addEventListener("resize", () => this.resize(), false);
			return gl;
		},
		resize() {
			this.width = this.elem.width = this.elem.offsetWidth;
			this.height = this.elem.height = this.elem.offsetHeight;
			for (const p of particles) p.init();
			this.gl.uniform2f(this.uResolution, this.width, this.height);
			this.gl.viewport(
				0,
				0,
				this.gl.drawingBufferWidth,
				this.gl.drawingBufferHeight
			);
		}
	};
	const pointer = {
		init(canvas) {
			this.ex = this.x = canvas.width * 0.5;
			this.ey = this.y = canvas.height * 0.5;
			["mousemove", "touchstart", "touchmove"].forEach((event, touch) => {
				document.addEventListener(
					event,
					e => {
						if (touch) {
							e.preventDefault();
							this.x = e.targetTouches[0].clientX;
							this.y = e.targetTouches[0].clientY;
						} else {
							this.x = e.clientX;
							this.y = e.clientY;
						}
					},
					false
				);
			});
		},
		ease() {
			this.ex += (this.x - this.ex) * 0.2;
			this.ey += (this.y - this.ey) * 0.2;
		}
	};
	// init webGL canvas
	const particles = [];
	const gl = canvas.init({
		alpha: false,
		stencil: true,
		antialias: true,
		depth: false
	});
	// additive blending "lighter"
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.BLEND);
	// init pointer
	pointer.init(canvas);
	// init particles
	const resX = Math.round(canvas.width / 5);
	const resY = Math.round(canvas.height / 5);;
	const nParticles = resX * resY;
	const posArray = new Float32Array(nParticles * 3);
	let k = 0;
	for (let i = 0; i < resX; i++) {
		for (let j = 0; j < resY; j++) {
			particles.push(new Particle(k++, i, j));
		}
	}
	// create position buffer
	const aPosition = gl.getAttribLocation(canvas.program, "aPosition");
	gl.enableVertexAttribArray(aPosition);
	const positionBuffer = gl.createBuffer();
	// draw all particles
	const draw = () => {
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			posArray,
			gl.DYNAMIC_DRAW
		);
		gl.drawArrays(gl.GL_POINTS, 0, nParticles);
	}
	// main animation loop
	const run = () => {
		requestAnimationFrame(run);
		pointer.ease();
		for (const p of particles) p.move(pointer.ex, pointer.ey);
		draw();
	};
	requestAnimationFrame(run);
}