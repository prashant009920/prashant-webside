const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width = 854;
const H = canvas.height = 480;

const SCORE = document.getElementById('score');

const assets = {
  bird: 'sustaa.jpg' // place your bird image here
};

let images = {};
let loaded = false;

function loadImages() {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { images.bird = img; res(); };
    img.onerror = () => { console.warn('bird asset missing'); res(); };
    img.src = assets.bird;
  });
}

// Game variables
let bird = {
  x: 180,
  y: H/2 - 20,
  w: 58,
  h: 46,
  vy: 0,
  g: 0.28,
  flap: -5,
  rot: 0
};

let pipes = [];
let frame = 0;
let spawnRate = 120; // frames
let gap = 170;
let speed = 3.1;
let score = 0;
let best = 0;
let running = true;
let gameOver = false;
const groundHeight = 86;

// Reset game
function reset(){
  bird.y = H/2 - 15; bird.vy = 0; bird.rot = 0;
  pipes = []; frame = 0; score = 0; running = true; gameOver = false;
  SCORE.innerText = score;
}

// Spawn pipe
function spawnPipe(){
  const minTop = 40;
  const maxTop = H - groundHeight - gap - 40;
  const top = Math.floor(Math.random()*(maxTop-minTop+1)) + minTop;
  pipes.push({x: W+40, top, bottom: top+gap, w:86});
}

// Draw mossy cap
function drawMossCap(x, y, w){
  ctx.save();
  ctx.translate(x, y);
  for(let i=0;i<Math.ceil(w/10);i++){
    const bx=i*10;
    const by=Math.sin(i*0.7+x*0.01)*4;
    ctx.beginPath();
    ctx.fillStyle='#9fe075';
    ctx.ellipse(bx+6, by+6, 8, 6, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// Background & clouds
function drawBackground(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#160d26');
  g.addColorStop(1,'#0f1426');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);

  ctx.globalAlpha=0.95;
  drawCloud(120,72,1);
  drawCloud(420,40,0.9);
  drawCloud(700,90,0.85);
  ctx.globalAlpha=1;
}

function drawCloud(cx, cy, scale){
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle='#ffffff22';
  roundedRect(ctx,-40,-12,80,24,12);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle='#ffffff1a';
  ctx.ellipse(-8,-6,22,12,0,0,Math.PI*2);
  ctx.ellipse(14,-8,18,11,0,0,Math.PI*2);
  ctx.ellipse(34,-6,14,9,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

// Draw pipes
function drawPipes(){
  pipes.forEach(p=>{
    const x=p.x,w=p.w;
    // top pipe
    ctx.fillStyle='#3ea63d';
    ctx.fillRect(x,0,w,p.top);
    ctx.fillStyle='#51c75a33';
    ctx.fillRect(x,0,6,p.top);
    drawMossCap(x-6,p.top-6,w+12);
    // bottom pipe
    ctx.fillStyle='#3ea63d';
    ctx.fillRect(x,p.bottom,w,H-p.bottom-groundHeight+6);
    drawMossCap(x-6,p.bottom-6,w+12);
    ctx.fillStyle='rgba(0,0,0,0.12)';
    ctx.fillRect(x,p.top-6,w,6);
  });
}

// Ground
function drawGround(){
  ctx.fillStyle='#2b7a38';
  ctx.fillRect(0,H-groundHeight,W,groundHeight);
  const stoneH=groundHeight;
  const cols=Math.ceil(W/86);
  for(let c=0;c<cols;c++){
    ctx.fillStyle='#2a5f2e';
    ctx.fillRect(c*86+4,H-stoneH+6,72,stoneH-12);
    const startX=c*86+10;
    for(let i=0;i<6;i++){
      const hx=startX+i*(72/6)+(Math.sin(c+i+frame*0.02)*4);
      const len=22+Math.abs(Math.sin(c*0.4+i)*10);
      ctx.beginPath();
      ctx.strokeStyle='#98e06a';
      ctx.lineWidth=4;
      ctx.moveTo(hx,H-stoneH+6);
      ctx.lineTo(hx-2,H-stoneH+6+len);
      ctx.stroke();
    }
  }
  for(let x=0;x<W;x+=18){
    const h=6+((x+frame)%11)/2;
    ctx.fillStyle='#9fe075';
    ctx.fillRect(x,H-groundHeight-h+6,14,h);
  }
}

// Draw bird
function drawBird(){
  ctx.save();
  const rot=Math.max(-0.6,Math.min(1.2,bird.vy*0.06));
  bird.rot+= (rot-bird.rot)*0.1; // smooth
  ctx.translate(bird.x+bird.w/2,bird.y+bird.h/2);
  ctx.rotate(bird.rot);
  if(images.bird){
    ctx.drawImage(images.bird,-bird.w/2,-bird.h/2,bird.w,bird.h);
  } else {
    ctx.fillStyle='#2b6cc4';
    ctx.beginPath();
    ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffd54a';
    ctx.fillRect(12,-6,8,6);
  }
  ctx.restore();
}

// Update physics
function update(){
  if(!running) return;
  frame++;
  bird.vy+=bird.g;
  bird.y+=bird.vy;

  if(frame%spawnRate===0) spawnPipe();

  for(let i=pipes.length-1;i>=0;i--){
    pipes[i].x-=speed;
    if(!pipes[i].scored && (pipes[i].x+pipes[i].w)<bird.x){
      pipes[i].scored=true;
      score++;
      SCORE.innerText=score;
      if(score>best) best=score;
    }
    if(bird.x<pipes[i].x+pipes[i].w &&
       bird.x+bird.w>pipes[i].x &&
       (bird.y<pipes[i].top || bird.y+bird.h>pipes[i].bottom)){
      gameOver=true; running=false;
    }
    if(pipes[i].x+pipes[i].w<-200) pipes.splice(i,1);
  }

  if(bird.y+bird.h>=H-groundHeight){
    bird.y=H-groundHeight-bird.h;
    gameOver=true; running=false;
  }
  if(bird.y<-20){ bird.y=-10; bird.vy=0; }
}

// Render everything
function render(){
  drawBackground();
  drawPipes();
  drawGround();
  drawBird();

  // draw player name top-left
  ctx.save();
  ctx.fillStyle='#9fe075';
  ctx.font='18px Arial';
  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.shadowColor='rgba(0,0,0,0.6)';
  ctx.shadowBlur=4;
  ctx.fillText('CREATOR PRASHANT THAPA',20,20);
  ctx.fillText('flying susta',5,5);
  ctx.restore();

  if(gameOver){
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(W/2-160,H/2-54,320,108);
    ctx.fillStyle='#fff';
    ctx.font='28px Arial';
    ctx.textAlign='center';
    ctx.fillText('Game Over',W/2,H/2-6);
    ctx.font='14px Arial';
    ctx.fillText('Press Space / Click to restart',W/2,H/2+20);
  }
}

// Game loop
function loop(){
  update();
  render();
  requestAnimationFrame(loop);
}

// Input
function flap(){
  if(gameOver){ reset(); return; }
  bird.vy=bird.flap;
}

window.addEventListener('keydown',e=>{
  if(e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); flap(); }
  if(e.key.toLowerCase()==='r'){ reset(); }
});
canvas.addEventListener('mousedown',()=>flap());
canvas.addEventListener('touchstart',e=>{ e.preventDefault(); flap(); },{passive:false});

// Start game
loadImages().then(()=>{
  loaded=true;
  reset();
  loop();
});
