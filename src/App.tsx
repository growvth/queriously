import { open } from "@tauri-apps/plugin-dialog";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { PDFViewer } from "./components/pdf/PDFViewer";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { TopBar } from "./components/layout/TopBar";
import { usePdf } from "./hooks/usePdf";

function App() {
  const { openPath } = usePdf();

  async function onOpen() {
    const path = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof path === "string") {
      try {
        await openPath(path);
      } catch (err) {
        console.error(err);
      }
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-base text-text-primary">
      <TopBar onOpen={onOpen} />
      <main className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="queriously-main">
          <Panel defaultSize={18} minSize={12} maxSize={32}>
            <Sidebar />
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={54} minSize={30}>
            <PDFViewer />
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={28} minSize={18} maxSize={45}>
            <RightPanel />
          </Panel>
        </PanelGroup>
      </main>
      <StatusBar />
    </div>
  );
}

function ResizeHandle() {
  return (
    <PanelResizeHandle className="w-[3px] bg-surface-border hover:bg-accent-primary/40 transition-colors" />
  );
}

export default App;
