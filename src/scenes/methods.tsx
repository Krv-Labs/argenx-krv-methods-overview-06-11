import {
  makeScene2D,
  Circle,
  Rect,
  Txt,
  Layout,
  Spline,
  Line,
} from '@motion-canvas/2d';
import {
  createRef,
  createSignal,
  all,
  any,
  delay,
  waitUntil,
  Vector2,
  easeInOutCubic,
} from '@motion-canvas/core';

// Interfaces for our state and points
interface PatientPoint {
  pos: Vector2;
  pos3D: { x: number; y: number; z: number };
  progress: any;
  isTarget: boolean;
  isIdeal: boolean;
  ref: any;
}

export default makeScene2D(function* (view) {
  // Set gorgeous, cinematic mathematical dark background color
  view.fill('#05070f');

  // --- SIGNALS FOR TEXT, POSITION, & VISIBILITY TRANSITIONS ---
  const cameraX = createSignal(2900); // Start at Patient Space (Zone 3: 2900) and move to Erdos Loop (Zone 4: 4300)
  const umapOpacity = createSignal(0); // Stages 3-7 scatter plots and models
  const stage8Opacity = createSignal(0); // Stage 9 final active learning graphics
  const erdosOpacity = createSignal(0); // Erdos Model Opacity (Materializes in Scene 8)
  const erdosPosition = createSignal(new Vector2(2960, 20)); // Erdos Model Position (Zone 3 Center, floats to Zone 4)
  const headerOpacity = createSignal(0); // Top-center floating pop-up header
  const headerTitle = createSignal('');
  const headerSub = createSignal('');
  const taglineOpacity = createSignal(0); // Bottom center tagline

  // Opacity & visual state signals for UMAP stages
  const narrowBoxOpacity = createSignal(0);
  const wideBoxOpacity = createSignal(0);
  const moldOpacity = createSignal(0);
  const idealRegionOpacity = createSignal(0);

  // Stage 9 Specific Signals
  const tableOpacity = createSignal(0);
  const erdosGlowOpacity = createSignal(0);
  const learningAlertOpacity = createSignal(0);

  // --- 3D SPACE ROTATION & INFLUENCE SIGNALS ---
  const spaceRotation = createSignal(0);
  const space3DInfluence = createSignal(0);
  const collapseProgress = createSignal(0);

  // --- DYNAMIC 3D DISMORPHED DONUT MANIFOLD SIGNALS ---
  const currentDonutScale = createSignal(0); // starts flat, grows/inflates in Scene 6
  const currentDonutRadiusScale = createSignal(1.0);

  // References for UMAP stages
  const narrowBoxRefA = createRef<Rect>();
  const wideBoxRefA = createRef<Rect>();
  const moldRefA = createRef<Spline>();
  const idealRingRefA = createRef<Circle>();

  // References for Stage 9 Active Learning loop
  const warehouseZone4Ref = createRef<Layout>();
  const erdosRef = createRef<Layout>();
  const tableRef = createRef<Rect>();
  const trialIconRef = createRef<Layout>();
  const stage8Packet1 = createRef<Circle>();
  const stage8Packet2 = createRef<Circle>();
  const stage8Packet3 = createRef<Circle>();
  const discrepancyPacketRef = createRef<Circle>();
  const queryPulseRef = createRef<Circle>();

  const matchedRefs = Array.from({ length: 7 }, () => createRef<Circle>());

  // --- SEEDED RANDOM POINT GENERATION ---
  // Simple LCG random generator for reproducible point distributions
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const points: PatientPoint[] = [];
  const numPoints = 150; // Dense and elegant points count
  const center = new Vector2(2960, 20);   // Unified Center of EHR Patient Space in Zone 3
  const warehouseZone3 = new Vector2(2250, 260); // Bottom-left database coordinate in Zone 3

  // Generate points for EHR Patient Cohort (Crescent curving Right)
  for (let i = 0; i < numPoints; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = rand() * 240 + 20;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);

    const relX = x - center.x;
    const relY = y - center.y;
    const distToCrescent = Math.sqrt((relX - 80) ** 2 + (relY - 30) ** 2);
    
    // Non-convex target criteria: points inside a crescent/curved band on the right
    const isTarget = distToCrescent > 60 && distToCrescent < 180 && relX > -40;

    // Ideal region is a sub-cluster inside the target shape
    const isIdeal = isTarget && relX > 70 && relY < 40 && relY > -40;

    // Generate 3D coordinates around center
    const x3D = relX;
    const y3D = relY;
    const z3D = (rand() - 0.5) * 300; // random depth for 3D layout

    points.push({
      pos: new Vector2(x, y),
      pos3D: { x: x3D, y: y3D, z: z3D },
      progress: createSignal(0),
      isTarget,
      isIdeal,
      ref: createRef<Circle>(),
    });
  }

  // Define points for Pulsar Conforming Mold A (Right-facing Crescent)
  const moldPointsA = [
    new Vector2(center.x + 20, center.y - 180),
    new Vector2(center.x + 180, center.y - 120),
    new Vector2(center.x + 210, center.y + 40),
    new Vector2(center.x + 130, center.y + 180),
    new Vector2(center.x + 30, center.y + 160),
    new Vector2(center.x - 50, center.y + 60),
    new Vector2(center.x - 100, center.y - 80),
    new Vector2(center.x - 60, center.y - 150),
  ];

  // Refined mold points (closer fit) on feedback loop
  const refinedMoldPointsA = moldPointsA.map(p => {
    const dir = p.sub(center);
    return center.add(dir.scale(0.85));
  });

  // Create signals for spline points morphing
  const currentMoldPointsA = moldPointsA.map(p => createSignal(p));

  // Helper to project 3D coordinates into 2D with rotation and perspective
  function project3D(x3D: number, y3D: number, z3D: number) {
    const cosA = Math.cos(spaceRotation());
    const sinA = Math.sin(spaceRotation());
    const rotX = x3D * cosA - z3D * sinA;
    const rotY = y3D;
    const rotZ = x3D * sinA + z3D * cosA;

    const distance = 800;
    const scale3d = distance / (distance + rotZ);
    return new Vector2(
      center.x + rotX * scale3d,
      center.y + rotY * scale3d
    );
  }

  // Generates 3D coordinates for a continuous hollow dismorphed donut (torus)
  // that is thick on the right side (where green target patients are) and thin on the left.
  function getDonutPoints() {
    const outerPoints: Vector2[] = [];
    const innerPoints: Vector2[] = [];
    const numSteps = 32;

    for (let i = 0; i < numSteps; i++) {
      const theta = (i / numSteps) * Math.PI * 2;
      
      // R is the centerline radius scaled by radius signal
      const R = (150 + 40 * Math.cos(theta)) * currentDonutRadiusScale();
      // r is the tube thickness, which bulges on the right and thins on the left, scaled by donut signal
      const r = (45 + 30 * Math.cos(theta)) * currentDonutScale();

      // Outer boundary point relative to center
      const xOut = (R + r) * Math.cos(theta);
      const yOut = (R + r) * Math.sin(theta);
      outerPoints.push(new Vector2(xOut, yOut));

      // Inner boundary point relative to center (defines the hole)
      const xIn = (R - r) * Math.cos(theta);
      const yIn = (R - r) * Math.sin(theta);
      innerPoints.push(new Vector2(xIn, yIn));
    }

    // Combine outer points (clockwise order) and inner points (counter-clockwise order)
    // to form a single continuous hollow path using non-zero winding rules for filled rendering
    const combined: Vector2[] = [];
    for (let i = 0; i < numSteps; i++) {
      combined.push(outerPoints[i]);
    }
    for (let i = numSteps - 1; i >= 0; i--) {
      combined.push(innerPoints[i]);
    }

    return combined;
  }

  // Helper function to animate single packet streams
  function* animatePacket(packet: any, start: Vector2, mid: Vector2, end: Vector2, delayTime: number) {
    packet.position(start);
    yield* delay(delayTime, all(
      packet.opacity(1, 0.1),
      packet.position(mid, 0.5, easeInOutCubic).to(end, 0.5, easeInOutCubic),
      delay(0.9, packet.opacity(0, 0.1))
    ));
  }

  // --- VIEW LAYOUT ---
  view.add(
    <Layout layout={false}>
      {/* 16:9 safe boundary guidelines */}
      <Rect
        width={1840}
        height={1000}
        stroke={'rgba(80, 120, 200, 0.08)'}
        lineWidth={1}
        radius={16}
        lineDash={[8, 8]}
        layout={false}
      />

      {/* FLOATING TOP POP-UP HEADER (Fixed on screen, doesn't slide) */}
      <Rect
        y={-400}
        width={1000}
        height={100}
        fill={'rgba(10, 14, 28, 0.75)'}
        stroke={'rgba(255, 255, 255, 0.08)'}
        lineWidth={1}
        radius={12}
        opacity={headerOpacity}
        layout={false}
        shadowColor={'rgba(0, 0, 0, 0.3)'}
        shadowBlur={30}
      >
        <Txt
          y={-18}
          fontFamily={'Manrope'}
          fontSize={22}
          fontWeight={800}
          fill={'#ffffff'}
          text={headerTitle}
        />
        <Txt
          y={22}
          fontFamily={'Manrope'}
          fontSize={14}
          fontWeight={500}
          fill={'#94a3b8'}
          text={headerSub}
          width={920}
          lineHeight={22}
        />
      </Rect>

      {/* FLOATING TAGLINE (Fixed at the bottom center of screen) */}
      <Txt
        y={420}
        fontFamily={'Manrope'}
        fontSize={13}
        fontWeight={700}
        letterSpacing={0.5}
        fill={'#3b82f6'}
        text={'Krv Labs × Pulsar — patient discovery that learns with you.'}
        opacity={taglineOpacity}
      />

      {/* SLIDING WORLD CONTAINER (Slides camera right by moving left) */}
      <Layout position={() => new Vector2(-cameraX(), 0)}>
        
        {/* ZONE 3 (x: 2400 to 3400): HIGH-DIMENSIONAL PATIENT SPACE */}
        <Layout opacity={umapOpacity}>
          {/* COHORT LABEL BADGE */}
          <Rect
            x={center.x}
            y={-290}
            width={180}
            height={36}
            fill={'rgba(59, 130, 246, 0.08)'}
            stroke={'rgba(59, 130, 246, 0.3)'}
            lineWidth={1.5}
            radius={18}
            layout={false}
          >
            <Circle
              x={-60}
              y={0}
              size={8}
              fill={'#10b981'}
              shadowBlur={8}
              shadowColor={'#10b981'}
            />
            <Txt
              x={10}
              y={0}
              fontFamily={'Manrope'}
              fontSize={13}
              fontWeight={700}
              letterSpacing={1}
              fill={'#10b981'}
              text={'EHR PATIENT COHORT'}
            />
          </Rect>

          {/* ZONE 3 DATA WAREHOUSE STACK (Caboodle / Clarity Database Platform) */}
          <Layout x={warehouseZone3.x} y={warehouseZone3.y} scale={0.85}>
            <Rect
              y={-50}
              width={180}
              height={36}
              fill={'rgba(15, 23, 42, 0.95)'}
              stroke={'#3b82f6'}
              lineWidth={1.5}
              radius={8}
              shadowBlur={15}
              shadowColor={'rgba(59, 130, 246, 0.15)'}
            >
              <Circle x={60} size={6} fill={'#34d399'} shadowBlur={6} shadowColor={'#34d399'} />
            </Rect>
            <Rect
              y={0}
              width={180}
              height={36}
              fill={'rgba(15, 23, 42, 0.95)'}
              stroke={'#3b82f6'}
              lineWidth={1.5}
              radius={8}
              shadowBlur={15}
              shadowColor={'rgba(59, 130, 246, 0.15)'}
            >
              <Circle x={60} size={6} fill={'#34d399'} shadowBlur={6} shadowColor={'#34d399'} />
            </Rect>
            <Rect
              y={50}
              width={180}
              height={36}
              fill={'rgba(15, 23, 42, 0.95)'}
              stroke={'#3b82f6'}
              lineWidth={1.5}
              radius={8}
              shadowBlur={15}
              shadowColor={'rgba(59, 130, 246, 0.15)'}
            >
              <Circle x={60} size={6} fill={'#34d399'} shadowBlur={6} shadowColor={'#34d399'} />
            </Rect>
            <Txt
              y={105}
              fontFamily={'Manrope'}
              fontSize={12}
              fontWeight={700}
              letterSpacing={1.2}
              fill={'#64748b'}
              text={'CABOODLE / CLARITY'}
            />
          </Layout>

          {/* NARROW FILTER BOX - 3D SHADED CUBE & STRICT I/E CRITERIA LABS */}
          <Layout opacity={narrowBoxOpacity}>
            {/* Back face */}
            <Line
              points={() => [
                project3D(110 - 80, -30 - 65, -80),
                project3D(110 + 80, -30 - 65, -80),
                project3D(110 + 80, -30 + 65, -80),
                project3D(110 - 80, -30 + 65, -80),
              ]}
              closed
              fill={'rgba(148, 163, 184, 0.04)'}
              stroke={'rgba(148, 163, 184, 0.35)'}
              lineWidth={1.5}
            />
            {/* Front face */}
            <Line
              points={() => [
                project3D(110 - 80, -30 - 65, 80),
                project3D(110 + 80, -30 - 65, 80),
                project3D(110 + 80, -30 + 65, 80),
                project3D(110 - 80, -30 + 65, 80),
              ]}
              closed
              fill={'rgba(148, 163, 184, 0.12)'}
              stroke={'rgba(148, 163, 184, 0.65)'}
              lineWidth={2}
            />
            {/* Side Connectors */}
            <Line
              points={() => [
                project3D(110 - 80, -30 - 65, -80),
                project3D(110 - 80, -30 - 65, 80),
              ]}
              stroke={'rgba(148, 163, 184, 0.35)'}
              lineWidth={1.5}
            />
            <Line
              points={() => [
                project3D(110 + 80, -30 - 65, -80),
                project3D(110 + 80, -30 - 65, 80),
              ]}
              stroke={'rgba(148, 163, 184, 0.35)'}
              lineWidth={1.5}
            />
            <Line
              points={() => [
                project3D(110 + 80, -30 + 65, -80),
                project3D(110 + 80, -30 + 65, 80),
              ]}
              stroke={'rgba(148, 163, 184, 0.35)'}
              lineWidth={1.5}
            />
            <Line
              points={() => [
                project3D(110 - 80, -30 + 65, -80),
                project3D(110 - 80, -30 + 65, 80),
              ]}
              stroke={'rgba(148, 163, 184, 0.35)'}
              lineWidth={1.5}
            />
          </Layout>
          <Txt
            x={center.x + 110}
            y={center.y - 105}
            fontFamily={'IBM Plex Sans'}
            fontSize={12}
            fontWeight={700}
            fill={'#94a3b8'}
            opacity={narrowBoxOpacity}
            text={'[INCLUSION] Age: 18-65'}
          />
          <Txt
            x={center.x + 110}
            y={center.y + 90}
            fontFamily={'IBM Plex Sans'}
            fontSize={12}
            fontWeight={700}
            fill={'#94a3b8'}
            opacity={narrowBoxOpacity}
            text={'[EXCLUSION] TSH > 0.1 mIU/L'}
          />

          {/* WIDE FILTER BOX - 3D SHADED CUBE & LOOSE CRITERIA LABS */}
          <Layout opacity={wideBoxOpacity}>
            {/* Back face */}
            <Line
              points={() => [
                project3D(-260, -260, -260),
                project3D(260, -260, -260),
                project3D(260, 260, -260),
                project3D(-260, 260, -260),
              ]}
              closed
              fill={'rgba(148, 163, 184, 0.03)'}
              stroke={'rgba(148, 163, 184, 0.25)'}
              lineWidth={1.5}
            />
            {/* Front face */}
            <Line
              points={() => [
                project3D(-260, -260, 260),
                project3D(260, -260, 260),
                project3D(260, 260, 260),
                project3D(-260, 260, 260),
              ]}
              closed
              fill={'rgba(148, 163, 184, 0.08)'}
              stroke={'rgba(148, 163, 184, 0.45)'}
              lineWidth={2}
            />
            {/* Side Connectors */}
            <Line
              points={() => [
                project3D(-260, -260, -260),
                project3D(-260, -260, 260),
              ]}
              stroke={'rgba(148, 163, 184, 0.25)'}
              lineWidth={1.5}
            />
            <Line
              points={() => [
                project3D(260, -260, -260),
                project3D(260, -260, 260),
              ]}
              stroke={'rgba(148, 163, 184, 0.25)'}
              lineWidth={1.5}
            />
            <Line
              points={() => [
                project3D(260, 260, -260),
                project3D(260, 260, 260),
              ]}
              stroke={'rgba(148, 163, 184, 0.25)'}
              lineWidth={1.5}
            />
            <Line
              points={() => [
                project3D(-260, 260, -260),
                project3D(-260, 260, 260),
              ]}
              stroke={'rgba(148, 163, 184, 0.25)'}
              lineWidth={1.5}
            />
          </Layout>
          <Txt
            x={center.x}
            y={center.y - 275}
            fontFamily={'IBM Plex Sans'}
            fontSize={13}
            fontWeight={700}
            fill={'#94a3b8'}
            opacity={wideBoxOpacity}
            text={'[LOOSE INCLUSION] Age: 18-99'}
          />
          <Txt
            x={center.x}
            y={center.y + 315}
            fontFamily={'IBM Plex Sans'}
            fontSize={13}
            fontWeight={700}
            fill={'#94a3b8'}
            opacity={wideBoxOpacity}
            text={'[LOOSE EXCLUSION] TSH > 10.0 mIU/L'}
          />

          {/* PULSAR CONFORMING MOLD A (3D DISMORPHED VOLUMETRIC WIREFRAME SPHERE) */}
          <Layout opacity={moldOpacity}>
            {/* Latitude Parallels */}
            {[-1.2, -0.6, 0, 0.6, 1.2].map((phi, lIdx) => (
              <Spline
                key={`lat-${lIdx}`}
                points={() => {
                  const ringPoints: Vector2[] = [];
                  const numSteps = 24;
                  for (let i = 0; i <= numSteps; i++) {
                    const theta = (i / numSteps) * Math.PI * 2;
                    // R is the centerline radius
                    const R = (150 + 50 * Math.cos(theta)) * currentDonutRadiusScale();
                    const rad = R * Math.cos(phi) * currentDonutScale();
                    const x = rad * Math.cos(theta);
                    const y = R * Math.sin(phi) * currentDonutScale();
                    const z = rad * Math.sin(theta);
                    ringPoints.push(project3D(x, y, z));
                  }
                  return ringPoints;
                }}
                stroke={'rgba(59, 130, 246, 0.35)'}
                lineWidth={1.5}
                layout={false}
              />
            ))}

            {/* Longitude Meridians */}
            {[0, Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3].map((theta, mIdx) => (
              <Spline
                key={`mer-${mIdx}`}
                ref={mIdx === 0 ? moldRefA : undefined} // Keep moldRefA associated to the primary meridian for animations
                points={() => {
                  const merPoints: Vector2[] = [];
                  const numSteps = 16;
                  for (let i = 0; i <= numSteps; i++) {
                    const phi = -Math.PI/2 + (i / numSteps) * Math.PI;
                    // R is the centerline radius
                    const R = (150 + 50 * Math.cos(theta)) * currentDonutRadiusScale();
                    const rad = R * Math.cos(phi) * currentDonutScale();
                    const x = rad * Math.cos(theta);
                    const y = R * Math.sin(phi) * currentDonutScale();
                    const z = rad * Math.sin(theta);
                    merPoints.push(project3D(x, y, z));
                  }
                  return merPoints;
                }}
                stroke={'rgba(0, 242, 254, 0.5)'}
                lineWidth={1.8}
                layout={false}
                shadowBlur={10}
                shadowColor={'rgba(0, 242, 254, 0.3)'}
              />
            ))}
          </Layout>

          {/* IDEAL RECOMMENDATION TARGET REGION */}
          <Circle
            ref={idealRingRefA}
            position={() => project3D(130, 0, 0)}
            size={() => {
              const cosA = Math.cos(spaceRotation());
              const sinA = Math.sin(spaceRotation());
              const rotZ = 130 * sinA;
              const distance = 800;
              const scale3d = distance / (distance + rotZ);
              return 160 * scale3d;
            }}
            stroke={'#38bdf8'}
            lineWidth={3}
            lineDash={[6, 6]}
            opacity={idealRegionOpacity}
            layout={false}
          />
          <Circle
            position={() => project3D(130, 0, 0)}
            size={() => {
              const cosA = Math.cos(spaceRotation());
              const sinA = Math.sin(spaceRotation());
              const rotZ = 130 * sinA;
              const distance = 800;
              const scale3d = distance / (distance + rotZ);
              return 35 * scale3d;
            }}
            fill={'#38bdf8'}
            opacity={idealRegionOpacity}
            layout={false}
            shadowBlur={20}
            shadowColor={'#38bdf8'}
          />
        </Layout>

        {/* ERDOS AI MODEL TRANSLATION SYSTEM (Declared globally in sliding World) */}
        <Layout ref={erdosRef} position={erdosPosition} opacity={erdosOpacity} scale={0}>
          {/* Neural Net Brain Inner Core */}
          <Circle size={80} fill={'rgba(234, 179, 8, 0.15)'} stroke={'#eab308'} lineWidth={2} shadowBlur={25} shadowColor={'#eab308'} />
          <Circle size={45} fill={'#eab308'} shadowBlur={15} shadowColor={'#eab308'} />

          {/* Concentric rotating math orbits */}
          <Circle size={110} stroke={'rgba(234, 179, 8, 0.4)'} lineWidth={1} lineDash={[4, 4]} />
          <Circle size={110} opacity={erdosGlowOpacity} fill={'rgba(234, 179, 8, 0.25)'} shadowBlur={40} shadowColor={'#eab308'} />

          {/* Neural Net Orbiting Nodes */}
          <Circle x={-60} y={-40} size={14} fill={'#eab308'} shadowBlur={8} shadowColor={'#eab308'} />
          <Circle x={60} y={-30} size={14} fill={'#eab308'} shadowBlur={8} shadowColor={'#eab308'} />
          <Circle x={-50} y={50} size={14} fill={'#eab308'} shadowBlur={8} shadowColor={'#eab308'} />
          <Circle x={50} y={40} size={14} fill={'#eab308'} shadowBlur={8} shadowColor={'#eab308'} />

          {/* Neural Synapses Links */}
          <Spline points={[new Vector2(0, 0), new Vector2(-60, -40)]} stroke={'rgba(234, 179, 8, 0.3)'} lineWidth={1.5} />
          <Spline points={[new Vector2(0, 0), new Vector2(60, -30)]} stroke={'rgba(234, 179, 8, 0.3)'} lineWidth={1.5} />
          <Spline points={[new Vector2(0, 0), new Vector2(-50, 50)]} stroke={'rgba(234, 179, 8, 0.3)'} lineWidth={1.5} />
          <Spline points={[new Vector2(0, 0), new Vector2(50, 40)]} stroke={'rgba(234, 179, 8, 0.3)'} lineWidth={1.5} />

          <Txt
            y={95}
            fontFamily={'Manrope'}
            fontSize={12}
            fontWeight={800}
            letterSpacing={1.2}
            fill={'#eab308'}
            text={'ERDOS AI TRANSLATOR'}
          />
        </Layout>

        {/* ACTIVE LEARNING WEIGHT SYNCHRONIZED POP-UP */}
        <Rect
          x={4600}
          y={-20}
          width={260}
          height={36}
          fill={'rgba(234, 179, 8, 0.08)'}
          stroke={'#eab308'}
          lineWidth={1}
          radius={6}
          opacity={learningAlertOpacity}
        >
          <Txt
            fontFamily={'IBM Plex Sans'}
            fontSize={9}
            fontWeight={800}
            fill={'#eab308'}
            letterSpacing={0.5}
            text={'[MODEL SYNAPSE ADJUSTED — ACCURACY RE-WEIGHTED]'}
          />
        </Rect>

        {/* ZONE 4 (x: 3800 to 4800): THE ERDOS AI MODEL PIPELINE LOOP */}
        <Layout opacity={stage8Opacity}>
          {/* Connection Line: Warehouse (4000) -> Researcher (4300) */}
          <Spline
            points={[new Vector2(4000, 100), new Vector2(4150, 0), new Vector2(4300, -100)]}
            stroke={'rgba(59, 130, 246, 0.15)'}
            lineWidth={2.5}
            lineDash={[6, 6]}
          />
          {/* Connection Line: SQL Terminal -> Screen */}
          <Spline
            points={[new Vector2(4300, 120), new Vector2(4300, -100)]}
            stroke={'rgba(0, 242, 254, 0.25)'}
            lineWidth={2}
          />
          {/* Query Pulse Line to Warehouse */}
          <Spline
            points={[new Vector2(4300, 120), new Vector2(4000, 100)]}
            stroke={'rgba(0, 242, 254, 0.15)'}
            lineWidth={2}
            lineDash={[5, 5]}
          />
          <Circle
            ref={queryPulseRef}
            size={24}
            fill={'#00f2fe'}
            opacity={0}
            shadowBlur={18}
            shadowColor={'#00f2fe'}
          />

          {/* ZONE 4 DATA WAREHOUSE STACK (Left Node) */}
          <Layout ref={warehouseZone4Ref} x={4000} y={100} scale={0.85}>
            <Rect
              y={-50}
              width={180}
              height={36}
              fill={'rgba(15, 23, 42, 0.95)'}
              stroke={'#3b82f6'}
              lineWidth={1.5}
              radius={8}
            >
              <Circle x={60} size={6} fill={'#34d399'} />
            </Rect>
            <Rect
              y={0}
              width={180}
              height={36}
              fill={'rgba(15, 23, 42, 0.95)'}
              stroke={'#3b82f6'}
              lineWidth={1.5}
              radius={8}
            >
              <Circle x={60} size={6} fill={'#34d399'} />
            </Rect>
            <Rect
              y={50}
              width={180}
              height={36}
              fill={'rgba(15, 23, 42, 0.95)'}
              stroke={'#3b82f6'}
              lineWidth={1.5}
              radius={8}
            >
              <Circle x={60} size={6} fill={'#34d399'} />
            </Rect>
            <Txt
              y={105}
              fontFamily={'Manrope'}
              fontSize={12}
              fontWeight={700}
              letterSpacing={1.2}
              fill={'#64748b'}
              text={'CABOODLE / CLARITY'}
            />
          </Layout>

          {/* PHYSICIAN / RESEARCHER GRAPHIC (Middle Node) */}
          <Layout x={4300} y={-100} scale={0.85}>
            <Circle size={100} fill={'rgba(30, 41, 59, 0.8)'} stroke={'#00f2fe'} lineWidth={2} shadowBlur={15} shadowColor={'#00f2fe'} />
            <Circle y={-15} size={30} fill={'#e2e8f0'} />
            <Circle y={32} size={60} fill={'#e2e8f0'} clip>
              <Rect y={30} width={60} height={40} fill={'rgba(10, 14, 28, 0.95)'} />
            </Circle>
            <Txt y={75} fontFamily={'Manrope'} fontSize={12} fontWeight={700} fill={'#64748b'} text={'CLINICAL RESEARCHER'} />
          </Layout>

          {/* SQL COHORT TERMINAL CONSOLE */}
          <Rect
            x={4300}
            y={120}
            width={280}
            height={130}
            fill={'rgba(10, 15, 30, 0.96)'}
            stroke={'#00f2fe'}
            lineWidth={1.5}
            radius={8}
          >
            <Rect y={-50} width={280} height={24} fill={'#1e293b'}>
              <Txt fontFamily={'IBM Plex Sans'} fontSize={9} fontWeight={600} fill={'#64748b'} text={'cohort_query.sh'} />
            </Rect>
            <Txt x={-120} y={-20} fontFamily={'IBM Plex Sans'} fontSize={9} fill={'#00f2fe'} text={'> QUERY graves_disease_trial'} offsetX={-1} />
            <Txt x={-120} y={0} fontFamily={'IBM Plex Sans'} fontSize={9} fill={'#818cf8'} text={'[CONNECTING ERDOS TRANSLATOR...]'} offsetX={-1} />
            <Txt x={-120} y={20} fontFamily={'IBM Plex Sans'} fontSize={9} fill={'#10b981'} text={'✔ Matched cohort list fetched.'} offsetX={-1} />
          </Rect>

          {/* FLOATING FEASIBLE CANDIDATES TABLE CARD (Sits above Terminal/Researcher) */}
          <Rect
            ref={tableRef}
            x={4300}
            y={-260}
            width={300}
            height={160}
            fill={'rgba(15, 23, 42, 0.96)'}
            stroke={'#38bdf8'}
            lineWidth={1.2}
            radius={8}
            opacity={tableOpacity}
          >
            <Rect y={-65} width={300} height={30} fill={'#1e293b'}>
              <Txt fontFamily={'Manrope'} fontSize={10} fontWeight={800} fill={'#cbd5e1'} text={'FEASIBLE CANDIDATES FEEDS'} />
            </Rect>
            {/* Draw 8 rows representing patient records (7 green matching, 1 red discrepancy) */}
            {Array.from({ length: 8 }).map((_, idx) => (
              <Rect
                key={`p-row-${idx}`}
                y={-40 + idx * 14}
                width={280}
                height={12}
                fill={'rgba(255, 255, 255, 0.02)'}
                radius={2}
                layout={false}
              >
                <Circle x={-130} size={5} fill={idx === 7 ? '#ef4444' : '#10b981'} shadowBlur={idx === 7 ? 6 : 0} shadowColor={'#ef4444'} />
                <Txt x={-110} fontFamily={'IBM Plex Sans'} fontSize={7} fontWeight={600} fill={'#94a3b8'} text={`PATIENT_ID_0${idx + 1}`} offsetX={-1} />
                <Txt x={110} fontFamily={'IBM Plex Sans'} fontSize={7} fontWeight={700} fill={idx === 7 ? '#f87171' : '#34d399'} text={idx === 7 ? 'DISCREPANCY' : 'MATCHED'} offsetX={1} />
              </Rect>
            ))}
          </Rect>

          {/* ACTIVE CLINICAL TRIAL ICON (Moves 7 accepted patients here) */}
          <Layout ref={trialIconRef} x={3980} y={-260} scale={0.95}>
            <Circle size={90} fill={'rgba(16, 185, 129, 0.1)'} stroke={'#10b981'} lineWidth={2} shadowBlur={15} shadowColor={'#10b981'} />
            <Circle size={45} fill={'rgba(16, 185, 129, 0.15)'} />
            {/* Shield Icon Graphic inside */}
            <Rect width={10} height={20} fill={'#10b981'} radius={1} />
            <Txt y={65} fontFamily={'Manrope'} fontSize={11} fontWeight={800} fill={'#10b981'} text={'ACTIVE TRIAL'} />
          </Layout>

          {/* Translucent stream particles for Stage 9 query/res */}
          <Circle ref={stage8Packet1} size={11} fill={'#eab308'} opacity={0} shadowBlur={8} shadowColor={'#eab308'} />
          <Circle ref={stage8Packet2} size={11} fill={'#eab308'} opacity={0} shadowBlur={8} shadowColor={'#eab308'} />
          <Circle ref={stage8Packet3} size={11} fill={'#eab308'} opacity={0} shadowBlur={8} shadowColor={'#eab308'} />
          <Circle ref={discrepancyPacketRef} size={12} fill={'#ef4444'} opacity={0} shadowBlur={10} shadowColor={'#ef4444'} />

          {/* 7 Matched particles representing patients moving to clinical trial */}
          {matchedRefs.map((ref, idx) => (
            <Circle key={`match-p-${idx}`} ref={ref} size={10} fill={'#10b981'} opacity={0} shadowBlur={8} shadowColor={'#10b981'} />
          ))}
        </Layout>

        {/* RENDER PATIENTS SCATTER PLOT (Starts at bottom-left Caboodle db [2250, 260], bursts into UMAP) */}
        {points.map((pt, idx) => (
          <Circle
            key={`pt-a-${idx}`}
            ref={pt.ref}
            position={() => {
              const p = pt.progress();
              const cosA = Math.cos(spaceRotation());
              const sinA = Math.sin(spaceRotation());
              const rotX = pt.pos3D.x * cosA - pt.pos3D.z * sinA;
              const rotY = pt.pos3D.y;
              const rotZ = pt.pos3D.x * sinA + pt.pos3D.z * cosA;

              const distance = 800;
              const scale3d = distance / (distance + rotZ);
              const projected3D = new Vector2(
                center.x + rotX * scale3d,
                center.y + rotY * scale3d
              );

              // Interpolate between flat exact 2D position and rotating 3D projected position
              const lerpX = pt.pos.x + (projected3D.x - pt.pos.x) * space3DInfluence();
              const lerpY = pt.pos.y + (projected3D.y - pt.pos.y) * space3DInfluence();
              let targetPos = new Vector2(lerpX, lerpY);

              // If collapsing, move targetPos towards the center
              const c = collapseProgress();
              if (c > 0) {
                targetPos = new Vector2(
                  targetPos.x + (center.x - targetPos.x) * c,
                  targetPos.y + (center.y - targetPos.y) * c
                );
              }

              // Lerp from warehouseZone3 when streaming out
              return new Vector2(
                warehouseZone3.x + (targetPos.x - warehouseZone3.x) * p,
                warehouseZone3.y + (targetPos.y - warehouseZone3.y) * p
              );
            }}
            size={() => {
              const p = pt.progress();
              const cosA = Math.cos(spaceRotation());
              const sinA = Math.sin(spaceRotation());
              const rotX = pt.pos3D.x * cosA - pt.pos3D.z * sinA;
              const rotZ = pt.pos3D.x * sinA + pt.pos3D.z * cosA;
              const distance = 800;
              const scale3d = distance / (distance + rotZ);

              const targetSize = 11 + (11 * scale3d - 11) * space3DInfluence();
              return targetSize * p;
            }}
            fill={() => pt.isTarget ? '#10b981' : '#64748b'} // target patients are green, non-target are gray
            opacity={0}
            shadowBlur={() => pt.isTarget ? 10 : 0}
            shadowColor={'rgba(16, 185, 129, 0.4)'}
          />
        ))}

      </Layout>
    </Layout>
  );

  // --- ANIMATION SEQUENCE ---

  // Scene 3: Patient Space (Sliding to high-dimensional patient vector space)
  yield* all(
    headerTitle('3. Patient Space', 0.1),
    headerSub('Here are the patients that fit our clinical trial profile. Projected in UMAP, they reveal complex, irregular topologies.', 0.1),
    headerOpacity(1, 0.5),
    taglineOpacity(1, 0.5),
    umapOpacity(1, 0.8),
    space3DInfluence(1, 0.8), // Activate 3D depth perspective
    spaceRotation(1.57, 3.5, easeInOutCubic), // Rotate 90 degrees to give the points depth, then stop!
    // Patient dots stream out of bottom-left Caboodle warehouse [2250, 260] ONE AT A TIME!
    all(
      ...points.map((pt, idx) =>
        delay(idx * 0.008, all( // rapid machine-gun delay (0.008s) for a beautiful continuous stream!
          pt.ref().opacity(1, 0.4),
          pt.progress(1, 1.0, easeInOutCubic)
        ))
      )
    )
  );

  yield* waitUntil('scene4');

  // Scene 4: Too Narrow Filter (SLOWNESS RE-PACED: 10X SLOWER!)
  yield* all(
    headerOpacity(0, 3.0), // 10x slower fade out (0.3s -> 3.0s)
  );
  yield* all(
    headerTitle('4. Traditional Filtering: Under-Precision', 4.0), // 10x slower (0.4s -> 4.0s)
    headerSub('Applying a strict, rectangular filter box cuts off massive regions of valid, high-quality candidates.', 4.0),
    headerOpacity(1, 5.0), // 10x slower (0.5s -> 5.0s)

    // Draw the too-narrow box (10x slower: 0.6s -> 6.0s)
    narrowBoxOpacity(1, 6.0),

    // Highlight points: points inside narrow filter stay teal, missed target points outside filter turn RED, noise points fade (10x slower: 0.6s -> 6.0s)
    ...points.map(pt => {
      const inBox =
        pt.pos.x >= center.x + 30 &&
        pt.pos.x <= center.x + 190 &&
        pt.pos.y >= center.y - 95 &&
        pt.pos.y <= center.y + 35;

      if (pt.isTarget && !inBox) {
        return pt.ref().fill('#ef4444', 6.0); // missed target turns red
      } else if (!pt.isTarget && !inBox) {
        return pt.ref().opacity(0.12, 6.0); // non-target fades
      }
      return pt.ref().scale(1.2, 4.0).to(1.0, 4.0);
    })
  );

  yield* waitUntil('scene5');

  // Scene 5: Too Wide Filter (SLOWNESS RE-PACED: 10X SLOWER!)
  yield* all(
    headerOpacity(0, 3.0), // 10x slower (0.3s -> 3.0s)
  );
  yield* all(
    headerTitle('5. Loose Boundaries: High Review Noise', 6.0), // 10x slower (0.6s -> 6.0s)
    headerSub('Making the box bigger to capture all candidates floods the study with a massive mountain of false positives.', 6.0),
    headerOpacity(1, 8.0), // 10x slower (0.8s -> 8.0s)

    // Rotate another 90 degrees (from 90 to 180 total) to show 3D depth perspective of the wide box!
    spaceRotation(3.14, 4.0, easeInOutCubic),

    // Swap boxes (10x slower: swap takes 5.0s / 8.0s)
    narrowBoxOpacity(0, 5.0),
    wideBoxOpacity(1, 8.0),

    // Point styling (10x slower: 0.6s -> 6.0s)
    ...points.map(pt => {
      if (pt.isTarget) {
        return pt.ref().fill('#10b981', 6.0); // target turns green again
      } else {
        const inBox =
          pt.pos.x >= center.x - 170 &&
          pt.pos.x <= center.x + 170 &&
          pt.pos.y >= center.y - 170 &&
          pt.pos.y <= center.y + 170;
        if (inBox) {
          return all(
            pt.ref().opacity(0.8, 6.0),
            pt.ref().fill('#6366f1', 6.0) // False Positive Color: electric indigo
          );
        } else {
          return pt.ref().opacity(0.1, 6.0);
        }
      }
    })
  );

  yield* waitUntil('scene6');

  // Scene 6: Pulsar Conforming Mold (SLOWNESS RE-PACED: 10X SLOWER!)
  yield* all(
    headerOpacity(0, 3.0), // 10x slower (0.3s -> 3.0s)
  );
  yield* all(
    headerTitle('6. Pulsar Adaptive Manifold Mold', 8.0), // 10x slower (0.8s -> 8.0s)
    headerSub('Disease states are fuzzy, irregular shapes—never a rigid box. Pulsar maps a precise, shape-based translation layer.', 8.0),
    headerOpacity(1, 10.0), // 10x slower (1.0s -> 10.0s)

    // Fade competitor wide box (10x slower: 0.6s -> 6.0s)
    wideBoxOpacity(0, 6.0),
    // Fade in conforming molds and inflate the dismorphed donut! (10x slower: 1.0s -> 10.0s)
    moldOpacity(1, 10.0),
    currentDonutScale(1.0, 8.0, easeInOutCubic),

    // Reset non-target points to faint muted grey and target points glow (10x slower: 0.6s -> 6.0s)
    ...points.map(pt => {
      if (pt.isTarget) {
        return pt.ref().scale(1.2, 4.0).to(1.0, 4.0);
      } else {
        return all(
          pt.ref().opacity(0.12, 6.0),
          pt.ref().fill('#2c354e', 6.0)
        );
      }
    })
  );

  yield* waitUntil('scene7');

  // Scene 7: Feedback Loop & Ideal Region (Standard graceful pace)
  yield* all(
    headerOpacity(0, 0.3),
  );
  yield* all(
    headerTitle('7. Continuous Learning Loop & Recommendation', 0.8),
    headerSub('Clinician curation feedback programmatically tightens each manifold, targeting small, ideal candidate regions.', 0.8),
    headerOpacity(1, 1.0),

    // Drop all of the points away entirely!
    ...points.map(pt => pt.ref().opacity(0, 0.6)),

    // Fade in Ideal Region Highlights
    idealRegionOpacity(1, 1.0),

    // Morph the dismorphed donut to a tighter, more refined shape to show the improvement!
    currentDonutScale(0.65, 3.0, easeInOutCubic),
  );

  // Ideal region pulsing target animation
  yield* idealRingRefA().scale(1.08, 0.8).to(0.96, 0.8).to(1.0, 0.5);

  yield* waitUntil('scene8');

  // Scene 8: Erdos Model Genesis
  yield* all(
    headerOpacity(0, 0.3),
  );
  yield* all(
    headerTitle('8. Erdos Model Genesis', 0.5),
    headerSub('The high-dimensional candidate manifold collapses to initialize the Erdos artificial intelligence model.', 0.5),
    headerOpacity(1, 0.6),

    // Fade out Zone 3 structural UMAP lines (except mold which collapses!)
    narrowBoxOpacity(0, 0.6),
    wideBoxOpacity(0, 0.6),
    idealRegionOpacity(0, 0.6),

    // Set Erdos starting position at the center of the Patient Space (2960, 20)
    erdosPosition(new Vector2(2960, 20), 0),
    erdosOpacity(1, 0.8),
    erdosRef().scale(0.9, 0.8, easeInOutCubic),

    // THE COLLAPSE: The rotating 3D dismorphed donut collapses into the Erdos core (2960, 20)
    moldOpacity(0, 1.4, easeInOutCubic),
    currentDonutScale(0, 1.4, easeInOutCubic),
    currentDonutRadiusScale(0, 1.4, easeInOutCubic),

    // Golden core energy wave expands and pulses on hit
    delay(1.2, all(
      erdosRef().scale(1.15, 0.25).to(0.9, 0.25),
      erdosGlowOpacity(1, 0.25).to(0, 0.5)
    ))
  );

  // Move into position for next scene (Float Erdos Model gracefully to the right as camera slides Zone 4)
  yield* all(
    cameraX(4300, 1.5, easeInOutCubic), // slide camera right!
    erdosPosition(new Vector2(4600, 100), 1.5, easeInOutCubic) // float model right!
  );

  yield* waitUntil('scene9');

  // Scene 9: The Erdos Active Learning Loop
  yield* all(
    headerOpacity(0, 0.3),
  );
  yield* all(
    headerTitle('9. Erdos Active Learning Cycle', 0.6),
    headerSub('Unifying data systems, clinician feedback, and active learning models to optimize candidate discovery.', 0.6),
    headerOpacity(1, 0.8),
    // Fade in Stage 9 active elements (Caboodle warehouse, SQL console, and Trial icons appear)
    stage8Opacity(1, 0.8),
  );

  // Erdos streams data to the SQL Terminal (middle bottom node)
  yield* all(
    animatePacket(stage8Packet1(), new Vector2(4600, 100), new Vector2(4450, 110), new Vector2(4300, 120), 0),
    animatePacket(stage8Packet2(), new Vector2(4600, 100), new Vector2(4450, 110), new Vector2(4300, 120), 0.2),
    animatePacket(stage8Packet3(), new Vector2(4600, 100), new Vector2(4450, 110), new Vector2(4300, 120), 0.4),
  );

  // SQL Terminal pings Caboodle Data Warehouse (left node)
  queryPulseRef().position(new Vector2(4300, 120));
  yield* all(
    queryPulseRef().opacity(1, 0.1),
    queryPulseRef().position(new Vector2(4000, 100), 0.6, easeInOutCubic),
    delay(0.5, all(
      queryPulseRef().opacity(0, 0.1),
      warehouseZone4Ref().scale(1.1, 0.2).to(1.0, 0.2)
    ))
  );

  // Feasible Candidates Log Table pops up above the researcher
  tableRef().scale(0);
  yield* all(
    tableOpacity(1, 0.4),
    tableRef().scale(1, 0.4, easeInOutCubic)
  );

  // 7 Accepted Patients physically rise from table rows and fly into Clinical Trial Shield icon (left top node)
  yield* all(
    ...matchedRefs.map((ref, idx) =>
      delay(idx * 0.12, all(
        ref().opacity(1, 0.1),
        ref().position(new Vector2(4300, -250 + idx * 14), 0),
        ref().position(new Vector2(3980, -260), 0.8, easeInOutCubic),
        delay(0.7, ref().opacity(0, 0.15))
      ))
    ),
    delay(0.7, trialIconRef().scale(1.15, 0.2).to(1.0, 0.2))
  );

  // 1 Discrepancy patient (red dot) is isolated and streams back into the Erdos Model (Active Feedback Learning)
  discrepancyPacketRef().position(new Vector2(4300, -142));
  yield* all(
    discrepancyPacketRef().opacity(1, 0.1),
    discrepancyPacketRef().position(new Vector2(4600, 100), 1.0, easeInOutCubic)
  );

  // Erdos core flashes gold and synchronizes accuracy alerts
  yield* all(
    discrepancyPacketRef().opacity(0, 0.1),
    erdosRef().scale(1.22, 0.3).to(1.0, 0.3),
    erdosGlowOpacity(1, 0.3).to(0, 0.6),
    learningAlertOpacity(1, 0.3)
  );

  // Let alert linger and then gently fade
  yield* delay(1.8, learningAlertOpacity(0, 0.6));

  yield* waitUntil('end');
});
