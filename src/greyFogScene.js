'use strict';

function drawSealGreyFogScene(context, width, height, time, intensity) {
  const horizon = height * 0.83;
  const towerX = width * 0.63;
  const clockY = height * 0.77;
  const clockRadius = Math.max(24, Math.min(width, height) * 0.040);
  const tau = Math.PI * 2;

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#070e15');
  sky.addColorStop(0.55, '#28424e');
  sky.addColorStop(0.84, '#73898e');
  sky.addColorStop(1, '#263840');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const moonX = width * 0.36;
  const moonY = height * 0.43;
  const moonRadius = Math.min(width, height) * 0.19;
  const moonlight = context.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius);
  moonlight.addColorStop(0, '#b9c5bfce');
  moonlight.addColorStop(0.12, '#afc8c799');
  moonlight.addColorStop(0.33, '#86a7ac37');
  moonlight.addColorStop(1, '#86a7ac00');
  context.fillStyle = moonlight;
  context.fillRect(moonX - moonRadius, moonY - moonRadius, moonRadius * 2, moonRadius * 2);

  // Deterministic rooflines keep the skyline still while the fog moves.
  for (let layer = 0; layer < 2; layer++) {
    const step = width / (layer === 0 ? 24 : 18);
    context.fillStyle = layer === 0 ? '#344b55' : '#162a35';
    context.beginPath();
    context.moveTo(0, height);
    for (let index = 0; index * step < width; index++) {
      const x = index * step;
      const profile = ((index * 29 + layer * 17) % 37) / 37;
      const roof = horizon + height * (layer * 0.065 - profile * (0.09 + layer * 0.04));
      context.lineTo(x, roof + 9);
      context.lineTo(x + step * 0.49, roof - 7);
      context.lineTo(x + step * 0.93, roof + 9);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fill();
  }

  context.save();
  context.translate(towerX, clockY);
  context.rotate(time * 0.000018);
  context.strokeStyle = 'rgba(239, 203, 145, 0.45)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, clockRadius * 3.5, 0, tau);
  context.moveTo(clockRadius * 3.72, 0);
  context.arc(0, 0, clockRadius * 3.72, 0, tau);
  context.stroke();
  for (let point = 0; point < 8; point++) {
    context.rotate(tau / 8);
    const mark = clockRadius * 3.72;
    context.beginPath();
    context.moveTo(mark - 4, 0);
    context.lineTo(mark, -4);
    context.lineTo(mark + 4, 0);
    context.lineTo(mark, 4);
    context.closePath();
    context.stroke();
  }
  context.restore();

  // The main facade stays stationary. Its dial moves only in Full Effects.
  context.save();
  context.translate(towerX, clockY);
  const radius = clockRadius;
  const facade = context.createLinearGradient(-radius * 2, 0, radius * 2, 0);
  facade.addColorStop(0, '#111c25');
  facade.addColorStop(0.54, '#24343c');
  facade.addColorStop(1, '#121d26');
  context.fillStyle = facade;
  context.beginPath();
  context.moveTo(-2.2 * radius, height);
  context.lineTo(-2.2 * radius, -1.35 * radius);
  context.lineTo(-1.75 * radius, -1.35 * radius);
  context.lineTo(-1.75 * radius, -1.85 * radius);
  context.lineTo(0, -4.2 * radius);
  context.lineTo(1.75 * radius, -1.85 * radius);
  context.lineTo(1.75 * radius, -1.35 * radius);
  context.lineTo(2.2 * radius, -1.35 * radius);
  context.lineTo(2.2 * radius, height);
  context.closePath();
  context.fill();
  context.strokeStyle = '#94a7a68c';
  context.lineWidth = 1;
  context.stroke();

  const dial = context.createRadialGradient(0, 0, 0, 0, 0, radius * 1.75);
  dial.addColorStop(0, '#ffe3ab');
  dial.addColorStop(0.51, '#e8aa64');
  dial.addColorStop(0.58, '#d39b539c');
  dial.addColorStop(1, '#d39b5300');
  context.fillStyle = dial;
  context.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 4);

  context.strokeStyle = '#2c201a';
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(0, 0, radius * 0.87, 0, tau);
  for (let tick = 0; tick < 12; tick++) {
    const angle = tick * tau / 12;
    context.moveTo(Math.cos(angle) * radius * 0.69, Math.sin(angle) * radius * 0.69);
    context.lineTo(Math.cos(angle) * radius * 0.81, Math.sin(angle) * radius * 0.81);
  }
  context.stroke();
  context.strokeStyle = '#352419';
  context.lineCap = 'round';
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-radius * 0.34, -radius * 0.35);
  context.moveTo(0, 0);
  const handAngle = -0.95 + time * 0.0001;
  context.lineTo(Math.cos(handAngle) * radius * 0.62, Math.sin(handAngle) * radius * 0.62);
  context.stroke();
  context.restore();

  // Wide, soft gradients give the fog depth without an image or a blur pass.
  for (let band = 0; band < 6; band++) {
    const phase = band * 1.71 + time * (0.00013 + band * 0.000009);
    const x = width * (0.12 + (band % 4) * 0.25 + Math.sin(phase) * 0.23);
    const y = height * (0.69 + band * 0.047 + Math.cos(phase) * 0.034);
    const spread = width * (0.34 + (band % 3) * 0.08);
    context.save();
    context.translate(x, y);
    context.scale(1, Math.max(0.09, height / width * 0.27));
    const fog = context.createRadialGradient(0, 0, 0, 0, 0, spread);
    fog.addColorStop(0, `rgba(194, 204, 204, ${Math.min(0.52, (0.26 + band * 0.026) * intensity)})`);
    fog.addColorStop(0.46, `rgba(145, 168, 174, ${0.20 * intensity})`);
    fog.addColorStop(1, 'rgba(119, 145, 155, 0)');
    context.fillStyle = fog;
    context.fillRect(-spread, -spread, spread * 2, spread * 2);
    context.restore();
  }
}
