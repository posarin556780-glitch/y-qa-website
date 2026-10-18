(() => {
  const cfg = window.APP_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_KEY &&
    !cfg.SUPABASE_URL.includes("ใส่_") && !cfg.SUPABASE_KEY.includes("ใส่_");
  const statusEl = document.querySelector("#admin-status");
  const loginPanel = document.querySelector("#login-panel");
  const dashboard = document.querySelector("#dashboard");
  const loginForm = document.querySelector("#login-form");
  const loginMessage = document.querySelector("#login-message");
  const questionForm = document.querySelector("#question-form");
  const questionMessage = document.querySelector("#question-message");
  const list = document.querySelector("#admin-questions");
  let client = null;

  function status(message, error = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", error);
    statusEl.hidden = !message;
  }
  function message(el, text, error = false) {
    el.textContent = text;
    el.style.color = error ? "#a12626" : "#177245";
  }
  function isAdmin(user) {
    // ต้องกำหนด app_metadata.role = "admin" จากฝั่งผู้ดูแลระบบเท่านั้น
    return user?.app_metadata?.role === "admin";
  }
  function setLoggedIn(user) {
    const allowed = isAdmin(user);
    loginPanel.hidden = Boolean(user && allowed);
    dashboard.hidden = !(user && allowed);
    if (user && !allowed) {
      loginPanel.hidden = false;
      dashboard.hidden = true;
      status("บัญชีนี้เข้าสู่ระบบได้ แต่ยังไม่ได้รับสิทธิ์แอดมิน กรุณาให้เจ้าของโปรเจกต์กำหนด role=admin ใน app_metadata", true);
    } else if (user && allowed) {
      status("เข้าสู่ระบบแอดมินแล้ว");
      document.querySelector("#admin-email").textContent = user.email || "แอดมิน";
      loadQuestions();
    }
  }
  function resetEditor() {
    questionForm.reset();
    questionForm.elements.id.value = "";
    questionForm.elements.is_published.checked = true;
    document.querySelector("#editor-title").textContent = "เพิ่มคำถามใหม่";
    document.querySelector("#save-question").textContent = "บันทึกคำถาม";
    document.querySelector("#cancel-edit").hidden = true;
    questionMessage.textContent = "";
  }
  function editQuestion(q) {
    questionForm.elements.id.value = q.id;
    questionForm.elements.title.value = q.title || "";
    questionForm.elements.description.value = q.description || "";
    questionForm.elements.is_published.checked = Boolean(q.is_published);
    document.querySelector("#editor-title").textContent = "แก้ไขคำถาม";
    document.querySelector("#save-question").textContent = "บันทึกการแก้ไข";
    document.querySelector("#cancel-edit").hidden = false;
    questionMessage.textContent = "";
    questionForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function loadQuestions() {
    if (!client) return;
    list.replaceChildren();
    const { data, error } = await client.from("questions")
      .select("id,title,description,is_published,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      status("โหลดคำถามไม่ได้ โปรดตรวจสอบ SQL policies ในคู่มือ", true);
      console.error(error);
      return;
    }
    if (!data.length) {
      const p = document.createElement("p");
      p.className = "empty-answers";
      p.textContent = "ยังไม่มีคำถาม เพิ่มคำถามได้จากแบบฟอร์มด้านบน";
      list.append(p);
      return;
    }
    data.forEach(q => {
      const item = document.createElement("article");
      item.className = "admin-question-item";
      const details = document.createElement("div");
      details.className = "admin-question-details";
      const title = document.createElement("strong");
      title.textContent = q.title;
      const meta = document.createElement("p");
      meta.textContent = q.is_published ? "เผยแพร่แล้ว" : "ซ่อนอยู่";
      meta.className = q.is_published ? "published-label" : "hidden-label";
      details.append(title, meta);
      const actions = document.createElement("div");
      actions.className = "admin-actions";
      const edit = document.createElement("button");
      edit.className = "small-action";
      edit.type = "button";
      edit.textContent = "แก้ไข";
      edit.addEventListener("click", () => editQuestion(q));
      const toggle = document.createElement("button");
      toggle.className = "small-action";
      toggle.type = "button";
      toggle.textContent = q.is_published ? "ซ่อน" : "เผยแพร่";
      toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        const { error } = await client.from("questions").update({ is_published: !q.is_published }).eq("id", q.id);
        toggle.disabled = false;
        if (error) { status("เปลี่ยนสถานะไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ฐานข้อมูล", true); console.error(error); return; }
        await loadQuestions();
      });
      const del = document.createElement("button");
      del.className = "small-action danger-action";
      del.type = "button";
      del.textContent = "ลบ";
      del.addEventListener("click", async () => {
        if (!confirm(`ต้องการลบคำถาม “${q.title}” และคำตอบทั้งหมดของคำถามนี้หรือไม่?`)) return;
        del.disabled = true;
        const { error } = await client.from("questions").delete().eq("id", q.id);
        del.disabled = false;
        if (error) { status("ลบไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ฐานข้อมูล", true); console.error(error); return; }
        resetEditor();
        await loadQuestions();
        status("ลบคำถามและคำตอบที่เกี่ยวข้องแล้ว");
      });
      actions.append(edit, toggle, del);
      item.append(details, actions);
      list.append(item);
    });
  }

  if (!configured || !window.supabase) {
    status("กรุณาตั้งค่า Supabase URL และ Publishable key ใน config.js ก่อน", true);
    loginPanel.hidden = true;
  } else {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    client.auth.getSession().then(({ data, error }) => {
      if (error) status("ตรวจสอบเซสชันไม่สำเร็จ", true);
      setLoggedIn(data?.session?.user || null);
      if (!data?.session?.user) loginPanel.hidden = false;
    });
    client.auth.onAuthStateChange((_event, session) => setLoggedIn(session?.user || null));
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return;
    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    message(loginMessage, "กำลังเข้าสู่ระบบ...");
    const { data, error } = await client.auth.signInWithPassword({
      email: loginForm.elements.email.value.trim(),
      password: loginForm.elements.password.value
    });
    button.disabled = false;
    if (error) {
      message(loginMessage, "เข้าสู่ระบบไม่สำเร็จ โปรดตรวจสอบอีเมลและรหัสผ่าน", true);
      return;
    }
    if (!isAdmin(data.user)) {
      await client.auth.signOut();
      message(loginMessage, "บัญชีนี้ยังไม่มีสิทธิ์แอดมิน", true);
      status("บัญชีนี้ยังไม่มีสิทธิ์แอดมิน", true);
      return;
    }
    loginForm.reset();
    message(loginMessage, "");
    setLoggedIn(data.user);
  });

  questionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = (await client.auth.getUser()).data.user;
    if (!isAdmin(user)) {
      status("เซสชันนี้ไม่มีสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่", true);
      return;
    }
    const id = questionForm.elements.id.value;
    const record = {
      title: questionForm.elements.title.value.trim(),
      description: questionForm.elements.description.value.trim() || null,
      is_published: questionForm.elements.is_published.checked
    };
    if (!record.title) return;
    const button = document.querySelector("#save-question");
    button.disabled = true;
    message(questionMessage, "กำลังบันทึก...");
    const result = id
      ? await client.from("questions").update(record).eq("id", id)
      : await client.from("questions").insert(record);
    button.disabled = false;
    if (result.error) {
      message(questionMessage, "บันทึกไม่สำเร็จ โปรดตรวจสอบว่าได้ตั้งค่า admin policies ตามคู่มือแล้ว", true);
      console.error(result.error);
      return;
    }
    resetEditor();
    message(questionMessage, id ? "บันทึกการแก้ไขแล้ว" : "เพิ่มคำถามแล้ว");
    status("บันทึกคำถามเรียบร้อย");
    await loadQuestions();
  });
  document.querySelector("#cancel-edit").addEventListener("click", resetEditor);
  document.querySelector("#reload-questions").addEventListener("click", loadQuestions);
  document.querySelector("#logout").addEventListener("click", async () => {
    await client.auth.signOut();
    dashboard.hidden = true;
    loginPanel.hidden = false;
    status("ออกจากระบบแล้ว");
  });
})();
