let cam;
let camX = 700;
let camY = -170; 
let camZ = 200;
let moveSpeed = 12;
let moveSpeedSidelæns = 8;
let tyngdekraft = 3;
let yaw = 0;    
let pitch = 0; 
let framesWithoutGround = 0;
const faceCoords = [];

const socket = new WebSocket('ws://ec2-13-48-181-220.eu-north-1.compute.amazonaws.com:8080');
let spillerID = 0;
let modstanderPos = [];
let retX;
let retY;
let retZ;

function preload() {
  level = loadModel('assets/spilbane.obj')
  sky = loadImage('assets/sky.jpg')
}

function setup() {
  angleMode(DEGREES);
  createCanvas(windowWidth, windowHeight, WEBGL);
  cam = createCamera();
  cam.setPosition(camX, camY, camZ);
  perspective(2 * atan(height / 2 / 800), width/height, 0.1, 10 * 800)

  // Liste over alle faces banen består af, [index af face][index af vertice][objekt (x,y,z)]
  for (let i = 0; i < level.faces.length; i++) {
      faceCoords.push(level.faces[i].map(index => level.vertices[index]));
  }
}

function draw() {
  background(220);
  translate(0, 0, 0);
  noStroke();
  let c = color(30, 30, 40);
  directionalLight(c, 0.408, 0.91, 0.5);
  ambientLight(150);
  panorama(sky);
  ambientMaterial(10,10,40);
  model(level);

  //Kamera og bevægelse
  let hCam = -movedX * 0.1;
  let vCam = movedY * 0.1;
  yaw += hCam;
  
  pitch += vCam;
  pitch = constrain(pitch, -89, 89); 

  // En vektor til bevægelse laves
  let forward = createVector(
    sin(yaw),
    0,
    cos(yaw)
  );

  if (keyIsDown(87)) { // W
    camX += forward.x * moveSpeed;
    camZ += forward.z * moveSpeed;
  }
  if (keyIsDown(83)) { // S
    camX -= forward.x * moveSpeed;
    camZ -= forward.z * moveSpeed;
  }
  if (keyIsDown(65)) { // A
    camZ -= forward.x * moveSpeedSidelæns;
    camX += forward.z * moveSpeedSidelæns;
  }
  if (keyIsDown(68)) { // D
    camZ += forward.x * moveSpeedSidelæns;
    camX -= forward.z * moveSpeedSidelæns;
  }

  cam.setPosition(camX, camY, camZ);
  
   

  //Noget hjernedødt trigonometri der tog et år at finde ud af
  let lookAtPoint = createVector(camX + forward.x, camY + sin(pitch), camZ + forward.z);
  cam.lookAt(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z);

  //Regn højden af jorden ud
for (let i = 0; i < level.faces.length; i++) {
        const face = level.faces[i];

        // Sæt min og max værdier
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;

        // gentag for hver vertex
        for (let j = 0; j < face.length; j++) {
            const vertexIndex = face[j]; //Index på vertex
            const vertex = level.vertices[vertexIndex]; //Selve koordinaternefor vertex

                minX = Math.min(minX, vertex.x);
                maxX = Math.max(maxX, vertex.x);
                minZ = Math.min(minZ, vertex.z);
                maxZ = Math.max(maxZ, vertex.z);
		minY = Math.min(minY, vertex.y);
		maxY = Math.max(maxY, vertex.y);
        }

	// X-akse kolission!!
	if (camZ >= minZ && camZ <= maxZ && camY >= minY && camY <= maxY) { 
	  camX = lodretKolission(camX, koordinater(i, "y", "x", "z", camY, camZ));
	}
	if (camX >= minX && camX <= maxX && camY >= minY && camY <= maxY) { 
	  camZ = lodretKolission(camZ, koordinater(i, "y", "z", "x", camY, camX));
	}


	// Y-akse kolission!!
	//Tjek om kameraet er mellem x og z af vertexen
        if (camX >= minX && camX <= maxX && camZ >= minZ && camZ <= maxZ) {
	  var yp = koordinater(i, "x", "y", "z", camX, camZ)-170;
		
	//Sæt y koordinatet af kameraet til den udregnede position -170 (Vi skal ikke være i selve gulvet)
	//Grundet fejl må den ikke bevæge sig mere end +-15 ad gangen
	    if(-20 < yp-camY && yp-camY < 20) {
	      camY = yp;
	      framesWithoutGround = 0;
	    } else {
	      framesWithoutGround++;
	    }

	  //Frames without ground bruger jeg for at undgå en fejl med at genkende faces som jeg simpelthen ikke kan løse - dette er en workaround
	    if(framesWithoutGround>10) {
	      //Tyngdekraft
	      if(camY<yp && camY < -170) {
		camY = camY+5;
	      }	
	    }
        }
    }
    
    //Skydning - raycast
    translate(0, 0, 0);

    retX =  cam.centerX - cam.eyeX
    retY =  cam.centerY - cam.eyeY
    retZ =  cam.centerZ - cam.eyeZ
    //Enhdesretning
    let enhed = sqrt(retX * retX + retY * retY + retZ * retZ);
    retX /= enhed;
    retY /= enhed;
    retZ /= enhed;
    //Linjelængde
    let længde = 1000;
    retX *= længde;
    retY *= længde;
    retZ *= længde;

    //Modstandere
    if (modstanderPos.length !== 0) {
      push();
      ambientMaterial(5,30,5);
      translate(modstanderPos[0],modstanderPos[1],modstanderPos[2]);

      box(100,200,100);
      pop();
    }

  //Skyd
  if(mouseIsPressed) {

    console.log(checkPlayerHit())
    if(checkRayHit()) {
      //Brug afstandsformlen til at se om væg er i vejen
      let dRay = sqrt(checkRayHit()[0]^2 + checkRayHit()[1]^2 + checkRayHit()[2]^2);
      let dModstander = sqrt(modstanderPos[0]^2 + modstanderPos[1]^2 + modstanderPos[2]^2);
      console.log(dRay, dModstander);
      if (dRay > dModstander) {
	console.log("hit");
      }
    }


  }
}

function koordinater(i, akse1, akse2, akse3, cam1, cam2) {
	var a1 = (faceCoords[i][0][akse1]); var b1 = (faceCoords[i][0][akse2]); var c1 = (faceCoords[i][0][akse3]);
	var a2 = (faceCoords[i][1][akse1]); var b2 = (faceCoords[i][1][akse2]); var c2 = (faceCoords[i][1][akse3]);
	var a3 = (faceCoords[i][2][akse1]); var b3 = (faceCoords[i][2][akse2]); var c3 = (faceCoords[i][2][akse3]);
	
	var denominator = (c2-c3)*(a1-a3)+(a3-a2)*(c1-c3);
	var α = ((c2-c3)*(cam1-a3) + (a3-a2)*(cam2-c3))/denominator;
	var β =	((c3-c1)*(cam1-a3) + (a1-a3)*(cam2-c3))/denominator;
	var γ = 1 - α - β;
	
	return (α*b1+β*b2+γ*b3);
}
//Kollission med vægge. Return positionen af kameraet
function lodretKolission(coord,xp) {
    if (xp - coord >= -20 && xp - coord <= 0) {
	return constrain(coord, xp + 20, xp - 20);
    } else if (xp - coord <= 20 && xp - coord >= 0) {
	return constrain(coord, xp - 20, xp - 20);
    }
  return coord;
}

//Lås musen
function mouseClicked() {
    fullscreen(true);
    requestPointerLock();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

//Multiplayer funktioner forneden

//Forbindelse åbnet
socket.onopen = function(event) {
    socket.send(JSON.stringify({ message: 'AnmodSpillerID', spilID: getURLParams().spilID}))
};

//Spilerlokation hvert 25ms
setInterval(() => {
    const positionData = {
	type: 'pos',
	spilID: getURLParams().spilID,
	player: spillerID,
	camX: camX,
	camY: camY,
	camZ: camZ
    };
    
    //console.log(positionData);
    socket.send(JSON.stringify(positionData));

}, 25);


socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.message === "GivenSpillerID") {
      spillerID = data.spillerID;
    }
    //? - Kun hvis arrayet findes
      if (data[0]?.message === "pos") {
	for (i=1;i<data.length;i++){
	  if (data[i]?.id !== spillerID) {
	    modstanderPos = [data[i].x, data[i].y+70, data[i].z];
	  }
	}
      }
};

socket.onerror = function(error) {
    console.error('WebSocket Error:', error);
};

socket.onclose = function(event) {
    console.log('WebSocket connection closed:', event);
};

//Vektores skæringspunkt i spilbanen, dette er bare matematik, og har ikke meget programmeringsdelen at gøre
function rayIntersectsTriangle(rayOrigin, rayDirection, v0, v1, v2) {
  const EPSILON = 0.0000001;

  //Udregner resterene vektorer for at skabe trekanten
  const edge1 = createVector(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
  const edge2 = createVector(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);

  // Udren krydsprodukt af retning og kant, og prikprodukt af det og kant1
  const h = p5.Vector.cross(rayDirection, edge2);
  const a = p5.Vector.dot(edge1, h);

  const f = 1.0 / a;
  const s = createVector(rayOrigin.x - v0.x, rayOrigin.y - v0.y, rayOrigin.z - v0.z);
  const u = f * p5.Vector.dot(s, h);

  if (u < 0.0 || u > 1.0) return null; // Skærinspunkt uden for trekant

  const q = p5.Vector.cross(s, edge1);
  const v = f * p5.Vector.dot(rayDirection, q);

  if (v < 0.0 || u + v > 1.0) return null; // Skæringspunkt uden for trekant

  //Udregn t for at finde skæringspunkt
  const t = f * p5.Vector.dot(edge2, q);

  if (t > EPSILON) {
    // Udregn skæringspunkt
    const intersectionPoint = createVector(
      rayOrigin.x + rayDirection.x * t,
      rayOrigin.y + rayDirection.y * t,
      rayOrigin.z + rayDirection.z * t
    );
    return intersectionPoint;
  }

  return null; // Ingen skæring
}

function checkRayHit() {
  const rayOrigin = createVector(camX, camY, camZ);
  const rayDirection = createVector(retX, retY, retZ).normalize(); // Enhedsvektor

  for (let i = 0; i < faceCoords.length; i++) {
    const v0 = createVector(
      faceCoords[i][0].x,
      faceCoords[i][0].y,
      faceCoords[i][0].z
    );
    const v1 = createVector(
      faceCoords[i][1].x,
      faceCoords[i][1].y,
      faceCoords[i][1].z
    );
    const v2 = createVector(
      faceCoords[i][2].x,
      faceCoords[i][2].y,
      faceCoords[i][2].z
    );
    //Skab vektor for hver face i banen, til brug af rayInterSectsTriangle()
    const intersection = rayIntersectsTriangle(rayOrigin, rayDirection, v0, v1, v2);
    if (intersection) {
      //Return skæringspunkt
      return([intersection.x, intersection.y, intersection.z]);
    }
  }
}

function checkPlayerHit () {
  const rayOrigin = createVector(camX, camY, camZ);
  const rayDir = createVector(retX, retY, retZ).normalize(); // Enhedsvektor

  //Spillerhitbox
  let boxMin = createVector(
    modstanderPos[0] - 50,
    modstanderPos[1] - 100,
    modstanderPos[2] - 50
  );
  
  let boxMax = createVector(
    modstanderPos[0] + 50,
    modstanderPos[1] + 100,
    modstanderPos[2] + 50
  );

  // Check for X skæring
  let tMin = (boxMin.x - rayOrigin.x) / rayDir.x;
  let tMax = (boxMax.x - rayOrigin.x) / rayDir.x;

  //Byt værdier (hvis negativ)
  if (tMin > tMax) [tMin, tMax] = [tMax, tMin];

  //Check for y skæring
  let tyMin = (boxMin.y - rayOrigin.y) / rayDir.y;
  let tyMax = (boxMax.y - rayOrigin.y) / rayDir.y;

  if (tyMin > tyMax) [tyMin, tyMax] = [tyMax, tyMin];

  if ((tMin > tyMax) || (tyMin > tMax)) return false;

  if (tyMin > tMin) tMin = tyMin;
  if (tyMax < tMax) tMax = tyMax;

  let tzMin = (boxMin.z - rayOrigin.z) / rayDir.z;
  let tzMax = (boxMax.z - rayOrigin.z) / rayDir.z;

  if (tzMin > tzMax) [tzMin, tzMax] = [tzMax, tzMin];

  if ((tMin > tzMax) || (tzMin > tMax)) return false;

  // Hvis vi når her, betyder det, at der er en skæring
  return true;
}
