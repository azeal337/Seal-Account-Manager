'use strict';

function drawMysteriesTarotCards() {
  const ink = '#ecd29e';
  const shade = '#9f865e';

  function lines(ctx, points, color = ink, width = 1.2) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function ring(ctx, x, y, radius, color = ink) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.05;
    ctx.stroke();
  }

  function star(ctx, x, y, size, color = ink) {
    lines(ctx, [[x - size, y], [x, y - size], [x + size, y], [x, y + size], [x - size, y]], color, 0.8);
  }

  function magician(ctx) {
    ctx.beginPath();
    ctx.moveTo(120, 51);
    ctx.bezierCurveTo(96, 83, 75, 55, 89, 44);
    ctx.bezierCurveTo(101, 35, 113, 45, 120, 51);
    ctx.bezierCurveTo(146, 82, 166, 56, 151, 44);
    ctx.bezierCurveTo(140, 35, 128, 44, 120, 51);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    lines(ctx, [[63, 142], [83, 91], [89, 95], [70, 143]], ink, 1.4);
    star(ctx, 86, 88, 6);
    lines(ctx, [[55, 146], [185, 146], [177, 157], [62, 157], [55, 146]], shade, 1.6);
    lines(ctx, [[67, 157], [64, 179]], shade, 1.4);
    lines(ctx, [[172, 157], [175, 179]], shade, 1.4);
    lines(ctx, [[104, 116], [131, 116], [127, 127], [118, 130], [118, 141], [110, 143], [126, 143]], ink, 1.4);
    ring(ctx, 147, 132, 10);
    star(ctx, 147, 132, 5, shade);
    lines(ctx, [[162, 139], [180, 114], [184, 112], [183, 117], [166, 141]], ink, 1.25);
    lines(ctx, [[161, 133], [171, 141]], shade);
    for (const [x, y] of [[56, 63], [182, 63], [45, 113], [193, 104]]) star(ctx, x, y, 3, shade);
  }

  function chariot(ctx) {
    lines(ctx, [[58, 138], [58, 66], [120, 42], [182, 66], [182, 138]], ink, 2);
    lines(ctx, [[58, 68], [94, 77], [120, 65], [146, 77], [182, 68]], shade, 2);
    star(ctx, 120, 94, 11);
    lines(ctx, [[63, 108], [177, 108], [166, 141], [74, 141], [63, 108]], ink, 2);
    lines(ctx, [[82, 120], [158, 120]], shade, 2);
    for (const x of [82, 158]) {
      ring(ctx, x, 149, 19);
      ring(ctx, x, 149, 13, shade);
      star(ctx, x, 149, 9);
    }
    lines(ctx, [[49, 174], [191, 174]], shade, 2);
  }

  const illustrations = { magician, chariot };
  for (const canvas of document.querySelectorAll('canvas[data-tarot-art]')) {
    if (canvas.dataset.drawn) continue;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.scale(canvas.width / 240, canvas.height / 200);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    illustrations[canvas.dataset.tarotArt](ctx);
    canvas.dataset.drawn = 'true';
  }
}
