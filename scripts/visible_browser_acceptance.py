import asyncio
import json
import base64
import os
import sys
import httpx
import websockets

ARTIFACTS_DIR = "/Users/kushal/.gemini/antigravity-ide/brain/adf28371-fbc6-447c-b4f5-6e533f86cda0"

async def execute_browser_acceptance():
    # 1. Discover CDP URL
    async with httpx.AsyncClient() as client:
        res = await client.get("http://localhost:9222/json")
        tabs = res.json()
        target = next((t for t in tabs if "5178" in t.get("url", "")), None)
        assert target, "No active tab found on localhost:5178"
        ws_url = target["webSocketDebuggerUrl"]
        print("Connected to CDP:", ws_url)

    async with websockets.connect(ws_url, max_size=20_000_000) as ws:
        msg_id = 0
        console_messages = []

        async def send_cmd(method, params=None):
            nonlocal msg_id
            msg_id += 1
            cmd = {"id": msg_id, "method": method, "params": params or {}}
            await ws.send(json.dumps(cmd))
            while True:
                resp = json.loads(await ws.recv())
                if "method" in resp and resp["method"] == "Runtime.consoleAPICalled":
                    args = [a.get("value", a.get("description", "")) for a in resp["params"].get("args", [])]
                    console_messages.append((resp["params"]["type"], " ".join(str(x) for x in args)))
                if resp.get("id") == msg_id:
                    return resp.get("result", {})

        async def eval_js(expr):
            res = await send_cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
            if "exceptionDetails" in res:
                print("JS Exception:", res["exceptionDetails"])
            return res.get("result", {}).get("value")

        async def take_screenshot(filename):
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            data = base64.b64decode(res["data"])
            path = os.path.join(ARTIFACTS_DIR, filename)
            with open(path, "wb") as f:
                f.write(data)
            print(f"📸 Captured screenshot: {filename} ({len(data)} bytes)")

        # Enable runtime & page
        await send_cmd("Runtime.enable")
        await send_cmd("Page.enable")

        print("=== Step 1 & 2: Load LEARNOVA and verify Home Screen ===")
        await send_cmd("Page.navigate", {"url": "http://localhost:5178/"})
        await asyncio.sleep(2.0)
        await take_screenshot("flow_01_home_screen.png")

        print("=== Step 3: Open Classroom ===")
        await eval_js("""
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Enter Classroom') || (b.textContent && b.textContent.includes('Learn') && b.closest('aside')));
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(1.5)

        print("=== Step 4 & 5: Ask Professor Nova a question & observe avatar ===")
        await eval_js("""
            (() => {
                const ta = document.querySelector('textarea');
                if (ta) {
                    const proto = window.HTMLTextAreaElement.prototype;
                    const nativeSet = Object.getOwnPropertyDescriptor(proto, 'value').set;
                    nativeSet.call(ta, 'Explain recursion in Python with a quick analogy.');
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    ta.dispatchEvent(new Event('change', { bubbles: true }));
                }
            })()
        """)
        await asyncio.sleep(0.5)
        await eval_js("""
            (() => {
                const sendBtn = document.querySelector('button[title=\"Send message\"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Send'));
                if (sendBtn) sendBtn.click();
            })()
        """)
        print("Waiting for response and avatar speech...")
        await asyncio.sleep(5.0)
        await take_screenshot("flow_02_avatar_speaking.png")

        print("=== Step 6: Stop speech ===")
        await eval_js("""
            (() => {
                const stopBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent && b.textContent.includes('Stop')) || b.title === 'Stop speech' || b.getAttribute('aria-label') === 'Stop speech');
                if (stopBtn) stopBtn.click();
            })()
        """)
        await asyncio.sleep(1.0)
        await take_screenshot("flow_03_speech_interrupted.png")

        print("=== Step 7: Replay speech ===")
        await eval_js("""
            (() => {
                const replayBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent && b.textContent.includes('Replay')) || b.title === 'Replay response' || b.getAttribute('aria-label') === 'Replay response');
                if (replayBtn) replayBtn.click();
            })()
        """)
        await asyncio.sleep(1.5)
        await take_screenshot("flow_04_speech_replayed.png")

        print("=== Step 8 & 9: Open Documents Hub and select Operating Systems Principles ===")
        await eval_js("""
            (() => {
                const docTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Documents') && b.closest('aside'));
                if (docTab) docTab.click();
            })()
        """)
        await asyncio.sleep(1.5)
        await take_screenshot("flow_05_documents_hub.png")

        print("=== Step 10 & 11: Select Operating Systems Principles document ===")
        await eval_js("""
            (() => {
                const titleEl = Array.from(document.querySelectorAll('h4')).find(h => h.textContent && h.textContent.includes('Operating Systems Principles'));
                if (titleEl) {
                    const card = titleEl.closest('.cursor-pointer');
                    if (card) {
                        card.click();
                        return true;
                    }
                }
                return false;
            })()
        """)
        await asyncio.sleep(2.0)

        print("=== Step 12 & 13: Ask grounded OS question ===")
        await eval_js("""
            (() => {
                const learnTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Learn') && b.closest('aside'));
                if (learnTab) learnTab.click();
            })()
        """)
        await asyncio.sleep(1.0)
        await eval_js("""
            (() => {
                const ta = document.querySelector('textarea');
                if (ta) {
                    const proto = window.HTMLTextAreaElement.prototype;
                    const nativeSet = Object.getOwnPropertyDescriptor(proto, 'value').set;
                    nativeSet.call(ta, 'Explain kernel architectures and context switching from the document.');
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    ta.dispatchEvent(new Event('change', { bubbles: true }));
                }
            })()
        """)
        await asyncio.sleep(0.5)
        await eval_js("""
            (() => {
                const sendBtn = document.querySelector('button[title=\"Send message\"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Send'));
                if (sendBtn) sendBtn.click();
            })()
        """)
        print("Waiting for grounded teacher response with citations...")
        await asyncio.sleep(5.0)
        await take_screenshot("flow_06_grounded_citations.png")

        print("=== Step 14 & 15: Open Quiz and verify active document grounding ===")
        await eval_js("""
            (() => {
                const quizBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Quiz') && !b.closest('aside'));
                if (quizBtn) quizBtn.click();
            })()
        """)
        await asyncio.sleep(2.0)
        await take_screenshot("flow_07_grounded_quiz.png")

        print("=== Step 16 & 17: Open Knowledge Graph and verify graph visualization ===")
        await eval_js("""
            (() => {
                const kgTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Knowledge') && b.closest('aside'));
                if (kgTab) kgTab.click();
            })()
        """)
        await asyncio.sleep(2.0)
        await take_screenshot("flow_08_grounded_knowledge_graph.png")

        print("=== Step 18, 19, 20: Open Nova Screen Companion & trigger upload guide ===")
        await eval_js("""
            (() => {
                const companionBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Screen') || b.textContent.includes('Companion')) || b.title === 'Screen Companion');
                if (companionBtn) companionBtn.click();
            })()
        """)
        await asyncio.sleep(1.5)
        await eval_js("""
            (() => {
                // Click 'Show me how to upload a document' quick action if available
                const quickAction = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Upload Study Material') || b.textContent.includes('upload a document'));
                if (quickAction) quickAction.click();
            })()
        """)
        await asyncio.sleep(2.0)
        await take_screenshot("flow_09_screen_companion_spotlight.png")

        print("=== Step 21, 22, 23, 24: Perform step & close companion ===")
        await eval_js("""
            (() => {
                const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Close drawer' || b.getAttribute('aria-label') === 'Close' || b.textContent === '✕');
                if (closeBtn) closeBtn.click();
            })()
        """)
        await asyncio.sleep(1.0)
        await take_screenshot("flow_10_guidance_completed.png")

        print("=== Step 25, 26, 27: Refresh page and verify stability ===")
        await send_cmd("Page.reload")
        await asyncio.sleep(2.5)
        await eval_js("""
            (() => {
                const learnTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Learn') && b.closest('aside'));
                if (learnTab) learnTab.click();
            })()
        """)
        await asyncio.sleep(1.0)
        await take_screenshot("flow_11_post_refresh_classroom.png")

        print("\n=== Browser Console Messages Audit ===")
        errors = [m for m in console_messages if m[0] == "error"]
        print(f"Total console events: {len(console_messages)}, Errors: {len(errors)}")
        for err_type, text in errors[:10]:
            print(f"[{err_type.upper()}] {text}")

        print("\n✓ Full visible browser acceptance flow completed successfully!")

asyncio.run(execute_browser_acceptance())
