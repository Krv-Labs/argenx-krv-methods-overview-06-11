import {
  makeScene2D,
  Circle,
  Rect,
  Txt,
  Layout,
} from '@motion-canvas/2d';
import {
  createRef,
  createSignal,
  all,
  delay,
  waitUntil,
  Vector2,
  easeInOutCubic,
} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  // Set gorgeous, cinematic mathematical dark background color
  view.fill('#05070f');

  // --- SIGNALS FOR TEXT & VISIBILITY TRANSITIONS ---
  const headerOpacity = createSignal(0);
  const headerTitle = createSignal('CLINICAL DATA ECOSYSTEM');
  const headerSub = createSignal('Powering precision research with unified, structured clinical datasets.');

  const sourcesOpacity = createSignal(0);
  const warehouseOpacity = createSignal(0);
  const insightsOpacity = createSignal(0);

  // References
  const sourceCardRef = createRef<Rect>();
  const warehouseStackRef = createRef<Layout>();
  const insightsCardRef = createRef<Rect>();

  // Packet flows
  const packet1 = createRef<Circle>();
  const packet2 = createRef<Circle>();
  const packet3 = createRef<Circle>();
  const packet4 = createRef<Circle>();

  view.add(
    <Layout>
      {/* Dynamic Cinematic Header */}
      <Layout y={-400} opacity={headerOpacity}>
        <Txt
          fontFamily={'Manrope'}
          fontSize={36}
          fontWeight={800}
          fill={'#ffffff'}
          text={headerTitle}
          textAlign={'center'}
          letterSpacing={2}
          y={0}
        />
        <Txt
          fontFamily={'IBM Plex Sans'}
          fontSize={16}
          fill={'#94a3b8'}
          text={headerSub}
          textAlign={'center'}
          y={45}
        />
      </Layout>

      {/* 3-Column Ecosystem Layout */}
      <Layout y={50}>
        {/* COLUMN 1: RAW DATA SOURCES */}
        <Rect
          ref={sourceCardRef}
          x={-500}
          width={340}
          height={480}
          radius={16}
          fill={'#0d1127'}
          stroke={'#1e293b'}
          lineWidth={2}
          opacity={sourcesOpacity}
          clip
        >
          <Txt
            y={-180}
            fontFamily={'Manrope'}
            fontSize={20}
            fontWeight={800}
            fill={'#38bdf8'}
            text={'RAW EHR DATA SOURCES'}
            letterSpacing={1.5}
            textAlign={'center'}
          />
          <Txt
            y={-150}
            fontFamily={'IBM Plex Sans'}
            fontSize={12}
            fill={'#64748b'}
            text={'Diverse, unstructured systems'}
            textAlign={'center'}
          />

          {/* Source Elements */}
          <Layout y={-40}>
            {/* Source 1 */}
            <Rect width={280} height={70} radius={8} fill={'#070a1e'} stroke={'#1e293b'} lineWidth={1} y={-80}>
              <Txt fontFamily={'Manrope'} fontSize={15} fontWeight={700} fill={'#e2e8f0'} text={'Electronic Health Records'} y={-10} textAlign={'center'} />
              <Txt fontFamily={'IBM Plex Sans'} fontSize={11} fill={'#64748b'} text={'Patient demographic & encounter logs'} y={15} textAlign={'center'} />
            </Rect>
            {/* Source 2 */}
            <Rect width={280} height={70} radius={8} fill={'#070a1e'} stroke={'#1e293b'} lineWidth={1} y={10}>
              <Txt fontFamily={'Manrope'} fontSize={15} fontWeight={700} fill={'#e2e8f0'} text={'Laboratory Databases'} y={-10} textAlign={'center'} />
              <Txt fontFamily={'IBM Plex Sans'} fontSize={11} fill={'#64748b'} text={'HL7 streams, lab results, vitals'} y={15} textAlign={'center'} />
            </Rect>
            {/* Source 3 */}
            <Rect width={280} height={70} radius={8} fill={'#070a1e'} stroke={'#1e293b'} lineWidth={1} y={100}>
              <Txt fontFamily={'Manrope'} fontSize={15} fontWeight={700} fill={'#e2e8f0'} text={'Unstructured Notes'} y={-10} textAlign={'center'} />
              <Txt fontFamily={'IBM Plex Sans'} fontSize={11} fill={'#64748b'} text={'Physician text, clinical reports'} y={15} textAlign={'center'} />
            </Rect>
          </Layout>
        </Rect>

        {/* COLUMN 2: UNIFIED DATA WAREHOUSE */}
        <Layout ref={warehouseStackRef} x={0} opacity={warehouseOpacity}>
          <Rect
            width={360}
            height={480}
            radius={16}
            fill={'#0c1535'}
            stroke={'#3b82f6'}
            lineWidth={2}
          >
            <Txt
              y={-180}
              fontFamily={'Manrope'}
              fontSize={20}
              fontWeight={800}
              fill={'#3b82f6'}
              text={'CLINICAL DATA WAREHOUSE'}
              letterSpacing={1.5}
              textAlign={'center'}
            />
            <Txt
              y={-150}
              fontFamily={'IBM Plex Sans'}
              fontSize={12}
              fill={'#60a5fa'}
              text={'Structured, Unified, & Secure'}
              textAlign={'center'}
            />

            {/* Glowing 3D-like Database Cylinders */}
            <Layout y={-25}>
              {/* Cylinder Top */}
              <Rect width={160} height={40} radius={20} fill={'#1d4ed8'} stroke={'#60a5fa'} lineWidth={2} y={-50} />
              {/* Cylinder Middle */}
              <Rect width={160} height={50} fill={'#1e40af'} stroke={'#3b82f6'} lineWidth={2} y={-15} />
              {/* Cylinder Bottom */}
              <Rect width={160} height={40} radius={20} fill={'#1d4ed8'} stroke={'#60a5fa'} lineWidth={2} y={10} />
              {/* Highlight Lines */}
              <Rect width={160} height={8} fill={'#3b82f6'} y={-35} />
              <Rect width={160} height={8} fill={'#3b82f6'} y={-10} />
            </Layout>

            {/* Database Characteristics */}
            <Layout y={120}>
              <Rect width={300} height={40} radius={6} fill={'#111827'} y={-30}>
                <Txt fontFamily={'IBM Plex Sans'} fontSize={13} fontWeight={600} fill={'#10b981'} text={'✔ Standardized Common Data Model'} textAlign={'center'} />
              </Rect>
              <Rect width={300} height={40} radius={6} fill={'#111827'} y={20}>
                <Txt fontFamily={'IBM Plex Sans'} fontSize={13} fontWeight={600} fill={'#10b981'} text={'✔ Cleaned, Indexed, & De-duplicated'} textAlign={'center'} />
              </Rect>
              <Rect width={300} height={40} radius={6} fill={'#111827'} y={70}>
                <Txt fontFamily={'IBM Plex Sans'} fontSize={13} fontWeight={600} fill={'#10b981'} text={'✔ Fully HIPAA Compliant & Secure'} textAlign={'center'} />
              </Rect>
            </Layout>
          </Rect>
        </Layout>

        {/* COLUMN 3: CLINICAL INSIGHTS / APPLICATIONS */}
        <Rect
          ref={insightsCardRef}
          x={500}
          width={340}
          height={480}
          radius={16}
          fill={'#0d1127'}
          stroke={'#1e293b'}
          lineWidth={2}
          opacity={insightsOpacity}
          clip
        >
          <Txt
            y={-180}
            fontFamily={'Manrope'}
            fontSize={20}
            fontWeight={800}
            fill={'#10b981'}
            text={'DOWNSTREAM APPLICATIONS'}
            letterSpacing={1.5}
            textAlign={'center'}
          />
          <Txt
            y={-150}
            fontFamily={'IBM Plex Sans'}
            fontSize={12}
            fill={'#64748b'}
            text={'Ready for immediate exploration'}
            textAlign={'center'}
          />

          {/* Applications Elements */}
          <Layout y={-40}>
            {/* App 1 */}
            <Rect width={280} height={70} radius={8} fill={'#070a1e'} stroke={'#1e293b'} lineWidth={1} y={-80}>
              <Txt fontFamily={'Manrope'} fontSize={15} fontWeight={700} fill={'#e2e8f0'} text={'Cohort Feasibility Queries'} y={-10} textAlign={'center'} />
              <Txt fontFamily={'IBM Plex Sans'} fontSize={11} fill={'#64748b'} text={'Identify target patient populations'} y={15} textAlign={'center'} />
            </Rect>
            {/* App 2 */}
            <Rect width={280} height={70} radius={8} fill={'#070a1e'} stroke={'#1e293b'} lineWidth={1} y={10}>
              <Txt fontFamily={'Manrope'} fontSize={15} fontWeight={700} fill={'#e2e8f0'} text={'AI & Machine Learning'} y={-10} textAlign={'center'} />
              <Txt fontFamily={'IBM Plex Sans'} fontSize={11} fill={'#64748b'} text={'Train predictive models on clean data'} y={15} textAlign={'center'} />
            </Rect>
            {/* App 3 */}
            <Rect width={280} height={70} radius={8} fill={'#070a1e'} stroke={'#1e293b'} lineWidth={1} y={100}>
              <Txt fontFamily={'Manrope'} fontSize={15} fontWeight={700} fill={'#e2e8f0'} text={'Interactive Visualizations'} y={-10} textAlign={'center'} />
              <Txt fontFamily={'IBM Plex Sans'} fontSize={11} fill={'#64748b'} text={'Dashboards and clinical mapping'} y={15} textAlign={'center'} />
            </Rect>
          </Layout>
        </Rect>
      </Layout>

      {/* GLOWING FLOW CHANNELS & PACKETS */}
      <Layout>
        {/* Packet Streams Left -> Middle */}
        <Circle ref={packet1} size={16} fill={'#38bdf8'} x={-320} y={0} opacity={0} shadowColor={'#38bdf8'} shadowBlur={15} />
        <Circle ref={packet2} size={12} fill={'#38bdf8'} x={-320} y={100} opacity={0} shadowColor={'#38bdf8'} shadowBlur={10} />

        {/* Packet Streams Middle -> Right */}
        <Circle ref={packet3} size={16} fill={'#10b981'} x={180} y={0} opacity={0} shadowColor={'#10b981'} shadowBlur={15} />
        <Circle ref={packet4} size={12} fill={'#10b981'} x={180} y={100} opacity={0} shadowColor={'#10b981'} shadowBlur={10} />
      </Layout>
    </Layout>
  );

  // Helper to animate glowing data packets
  function* flowLeftToRight(packet: any, startX: number, endX: number, yVal: number, delaySec: number) {
    packet.position([startX, yVal]);
    yield* delay(delaySec, all(
      packet.opacity(1, 0.2),
      packet.position([endX, yVal], 0.8, easeInOutCubic),
      delay(0.6, packet.opacity(0, 0.2))
    ));
  }

  // --- ANIMATION SEQUENCE ---

  // Step 1: Reveal Raw Data Sources
  yield* all(
    headerOpacity(1, 0.8),
    sourcesOpacity(1, 0.8),
  );
  yield* delay(0.5, sourceCardRef().scale(1.03, 0.3).to(1.0, 0.3));

  yield* waitUntil('scene2');

  // Step 2: Ingest into Unified Warehouse
  yield* all(
    headerTitle('UNIFIED CLINICAL WAREHOUSE', 0.5),
    headerSub('Consolidating fragmented records into a structured, secure clinical database.', 0.5),
    warehouseOpacity(1, 0.8),
  );

  // Flow packets from sources into warehouse
  yield* all(
    flowLeftToRight(packet1(), -320, -180, -30, 0),
    flowLeftToRight(packet2(), -320, -180, 70, 0.25),
    flowLeftToRight(packet1(), -320, -180, -30, 0.5),
    flowLeftToRight(packet2(), -320, -180, 70, 0.75),
    warehouseStackRef().scale(1.03, 0.4).to(1.0, 0.4),
  );

  yield* waitUntil('scene3');

  // Step 3: Stream clean data to Downstream Insights
  yield* all(
    headerTitle('ACTIVE RESEARCH & CLINICAL INSIGHTS', 0.5),
    headerSub('Enabling instant cohort discovery, predictive AI modeling, and rich visualizations.', 0.5),
    insightsOpacity(1, 0.8),
  );

  // Flow packets from warehouse into downstream apps
  yield* all(
    flowLeftToRight(packet3(), 180, 320, -30, 0),
    flowLeftToRight(packet4(), 180, 320, 70, 0.25),
    flowLeftToRight(packet3(), 180, 320, -30, 0.5),
    flowLeftToRight(packet4(), 180, 320, 70, 0.75),
    insightsCardRef().scale(1.03, 0.4).to(1.0, 0.4),
  );

  yield* waitUntil('end');
});