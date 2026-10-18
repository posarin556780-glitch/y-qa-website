(() => {
  const statusEl = document.querySelector("#status");
  const questionsEl = document.querySelector("#questions");
  const template = document.querySelector("#question-template");
  const config = window.APP_CONFIG || {};
  const configured = config.SUPABASE_URL && config.SUPABASE_KEY &&
    !config.SUPABASE_URL.includes("ใส่_") && !config.SUPABASE_KEY.includes("ใส่_");
  let supabase = null;

  const escapeText = (value) => String(value ?? "");
  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  };
  function setStatus(message, error = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", error);
    statusEl.hidden = !message;
  }
  function showAnswers(container, answers) {
    container.replaceChildren();
    if (!answers.length) {
      const empty = document.createElement("p");
      empty.className = "empty-answers";
      empty.textContent = "ยังไม่มีคำตอบ เป็นคนแรกที่แบ่งปันความคิดเห็นได้เลย";
      container.append(empty);
      return;
    }
    answers.forEach((answer) => {
      const item = document.createElement("div");
      item.className = "answer-item";
      const meta = document.createElement("div");
      meta.className = "answer-meta";
      const name = document.createElement("strong");
      name.textContent = answer.display_name || "ผู้ตอบไม่ระบุชื่อ";
      const date = document.createElement("span");
      date.textContent = formatDate(answer.created_at);
      meta.append(name, date);
      const body = document.createElement("div");
      body.className = "answer-text";
      body.textContent = answer.body;
      item.append(meta, body);
      container.append(item);
    });
  }
  function renderQuestion(question, answers, index) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".question-card");
    card.querySelector(".question-number").textContent = `คำถามที่ ${index + 1}`;
    card.querySelector(".answer-count").textContent = `${answers.length} คำตอบ`;
    card.querySelector(".question-title").textContent = question.title;
    const description = card.querySelector(".question-description");
    description.textContent = question.description || "";
    description.hidden = !question.description;
    card.querySelector(".answer-total").textContent = `${answers.length} รายการ`;
    showAnswers(card.querySelector(".answers-list"), answers);

    const form = card.querySelector(".answer-form");
    const message = form.querySelector(".form-message");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector("button[type=submit]");
      const body = form.elements.answer.value.trim();
      const displayName = form.elements.display_name.value.trim();
      if (!displayName) {
        message.style.color = "#a12626";
        message.textContent = "กรุณากรอกชื่อเล่นก่อนส่งคำตอบ";
        form.elements.display_name.focus();
        return;
      }
      if (!body) {
        message.style.color = "#a12626";
        message.textContent = "กรุณาพิมพ์คำตอบก่อนส่ง";
        form.elements.answer.focus();
        return;
      }
      submit.disabled = true;
      message.style.color = "#68758b";
      message.textContent = "กำลังส่งคำตอบ...";
      const { error } = await supabase.from("answers").insert({
        question_id: question.id,
        body,
        display_name: displayName
      });
      submit.disabled = false;
      if (error) {
        message.style.color = "#a12626";
        message.textContent = "ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        console.error(error);
        return;
      }
      form.reset();
      message.style.color = "#177245";
      message.textContent = "ส่งคำตอบแล้ว กำลังอัปเดต...";
      await loadQuestions(false);
      const matchingCard = [...questionsEl.querySelectorAll(".question-card")]
        .find(el => el.querySelector(".question-title")?.textContent === question.title);
      if (matchingCard) {
        const feedback = matchingCard.querySelector(".form-message");
        if (feedback) feedback.textContent = "ส่งคำตอบเรียบร้อยแล้ว ขอบคุณที่ร่วมแบ่งปัน!";
      }
    });
    return fragment;
  }

  async function loadQuestions(showLoading = true) {
    if (!configured || !supabase) {
      setStatus("ตั้งค่า Supabase ก่อนใช้งานจริง: เปิดไฟล์ config.js แล้วใส่ Project URL และ Publishable key ตามคู่มือ README.md", true);
      questionsEl.replaceChildren();
      const note = document.createElement("div");
      note.className = "no-questions";
      note.textContent = "เว็บไซต์ตัวอย่างพร้อมแล้ว หลังเชื่อมต่อฐานข้อมูล คำถามและคำตอบจะปรากฏที่นี่ และทุกคนจะเห็นข้อมูลชุดเดียวกัน";
      questionsEl.append(note);
      return;
    }
    if (showLoading) setStatus("กำลังโหลดคำถาม...");
    const { data: questions, error: questionError } = await supabase
      .from("questions").select("id,title,description,created_at").eq("is_published", true).order("created_at", { ascending: false });
    if (questionError) {
      setStatus("โหลดคำถามไม่ได้ กรุณาตรวจสอบการตั้งค่าฐานข้อมูลตาม README.md", true);
      console.error(questionError);
      return;
    }
    const { data: answers, error: answerError } = await supabase
      .from("answers").select("id,question_id,body,display_name,created_at").order("created_at", { ascending: false });
    if (answerError) {
      setStatus("โหลดคำตอบไม่ได้ กรุณาตรวจสอบสิทธิ์ฐานข้อมูล", true);
      console.error(answerError);
      return;
    }
    questionsEl.replaceChildren();
    if (!questions.length) {
      setStatus("เชื่อมต่อฐานข้อมูลแล้ว แต่ยังไม่มีคำถาม ให้เพิ่มคำถามตามคู่มือ README.md", false);
      const note = document.createElement("div");
      note.className = "no-questions";
      note.textContent = "ยังไม่มีคำถามใหม่ โปรดกลับมาอีกครั้งภายหลัง";
      questionsEl.append(note);
      return;
    }
    setStatus(`พร้อมใช้งาน · ${questions.length} คำถาม`, false);
    questions.forEach((question, index) => {
      const related = answers.filter(answer => answer.question_id === question.id);
      questionsEl.append(renderQuestion(question, related, index));
    });
  }

  document.querySelector("#refresh").addEventListener("click", () => loadQuestions(true));
  if (configured && window.supabase) {
    supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    loadQuestions();
  } else {
    loadQuestions();
  }
})();
