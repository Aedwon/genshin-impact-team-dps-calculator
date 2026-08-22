import { BuffsPanel } from './components/BuffsPanel';
import { EnemyPanel } from './components/EnemyPanel';
import { EnergyPanel } from './components/EnergyPanel';
import { ExportImportBar } from './components/ExportImportBar';
import { GidmgExportPanel } from './components/GidmgExportPanel';
import { OutputPanel } from './components/OutputPanel';
import { RotationPanel } from './components/RotationPanel';
import { UnitsPanel } from './components/UnitsPanel';

function App() {
  return (
    <>
      <h1>KQM-Standard Genshin Team DPS Calculator</h1>
      <ExportImportBar />
      <UnitsPanel />
      <EnergyPanel />
      <BuffsPanel />
      <EnemyPanel />
      <RotationPanel />
      <OutputPanel />
      <GidmgExportPanel />
    </>
  );
}

export default App;
