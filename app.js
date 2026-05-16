const TEMPERAMENT_TAGS = ["Friendly", "Loyal", "Active", "Playful", "Smart", "Calm", "Curious", "Outgoing", "Courageous"];

const weightLbs = str => {
  if (!str) return null;
  const nums = str.match(/\d+/g);
  if (!nums) return null;
  return nums.map(Number).reduce((a, b) => a + b, 0) / nums.length;
};

const sizeOf = dog => {
  const w = weightLbs(dog.weight);
  if (w === null) return "unknown";
  if (w < 25)  return "small";
  if (w <= 60) return "medium";
  return "large";
};

const tempsOf = dog => {
  if (!dog.temperament) return [];
  return dog.temperament.split(/[,\/]/).map(t => t.trim()).filter(Boolean);
};

let dogs = [], activeSize = "", activeTemps = new Set(), query = "";

const render = () => {
  const grid = document.getElementById("grid");
  const filtered = dogs.filter(d => {
    if (query && !d.name.toLowerCase().includes(query)) return false;
    if (activeSize && sizeOf(d) !== activeSize) return false;
    if (activeTemps.size > 0) {
      const breedTemps = tempsOf(d).map(t => t.toLowerCase());
      if (![...activeTemps].every(at => breedTemps.some(t => t.includes(at.toLowerCase())))) return false;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById("count").textContent = `${filtered.length} breed${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">No breeds match your filters.</div>';
    return;
  }

  grid.innerHTML = filtered.map(d => {
    const temps = tempsOf(d);
    return `
      <div class="card" data-index="${dogs.indexOf(d)}">
        <div class="card-group">${d.group || "—"}</div>
        <div class="card-name">${d.name}</div>
        <div class="card-tags">${temps.map(t => `<span class="tag">${t}</span>`).join("")}</div>
        <div class="card-meta">
          ${d.weight          ? `<span>⚖️ ${d.weight}</span>` : ""}
          ${d.life_expectancy ? `<span>🕐 ${d.life_expectancy}</span>` : ""}
        </div>
      </div>`;
  }).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => openModal(dogs[+card.dataset.index]));
  });
};

const openModal = dog => {
  const temps = tempsOf(dog);
  const stats = [
    ["Height", dog.height], ["Weight", dog.weight],
    ["Life Expectancy", dog.life_expectancy], ["Group", dog.group],
  ].filter(([, v]) => v);

  document.getElementById("modal-body").innerHTML = `
    <div class="modal-group">${dog.group || ""}</div>
    <div class="modal-name">${dog.name}</div>
    ${temps.length ? `<div class="modal-tags">${temps.map(t => `<span class="modal-tag">${t}</span>`).join("")}</div>` : ""}
    ${stats.length ? `<div class="modal-stats">${stats.map(([l, v]) => `<div class="stat"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></div>`).join("")}</div>` : ""}
    ${dog.about ? `<p class="modal-about">${dog.about}</p>` : ""}
    ${dog.url   ? `<a class="modal-link" href="${dog.url}" target="_blank" rel="noopener">View on AKC ↗</a>` : ""}
  `;
  document.getElementById("overlay").classList.add("open");
};

const closeModal = () => document.getElementById("overlay").classList.remove("open");

const buildTempFilters = () => {
  const present = new Set(dogs.flatMap(tempsOf).map(t => t.trim()));
  const toShow = TEMPERAMENT_TAGS.filter(t => [...present].some(p => p.toLowerCase().includes(t.toLowerCase())));
  const wrap = document.getElementById("temp-filters");
  const allBtn = wrap.querySelector("[data-temp='']");

  toShow.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.temp = t;
    btn.textContent = t;
    btn.addEventListener("click", () => {
      if (activeTemps.has(t)) {
        activeTemps.delete(t);
        btn.classList.remove("active");
      } else {
        activeTemps.add(t);
        btn.classList.add("active");
      }
      allBtn.classList.toggle("active", activeTemps.size === 0);
      render();
    });
    wrap.appendChild(btn);
  });

  allBtn.addEventListener("click", () => {
    activeTemps.clear();
    wrap.querySelectorAll("[data-temp]").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    render();
  });
};

// Controls
document.getElementById("search").addEventListener("input", e => {
  query = e.target.value.toLowerCase().trim();
  render();
});

document.querySelectorAll("[data-size]").forEach(btn => {
  btn.addEventListener("click", () => {
    activeSize = btn.dataset.size;
    document.querySelectorAll("[data-size]").forEach(b => b.classList.toggle("active", b === btn));
    render();
  });
});

// "All" temperament chip wired in buildTempFilters after data loads

document.getElementById("overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("overlay")) closeModal();
});
document.getElementById("modal-close").addEventListener("click", closeModal);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// Load data
fetch("dogs.json")
  .then(r => r.json())
  .then(data => {
    dogs = data;
    buildTempFilters();
    render();
  })
  .catch(() => {
    document.getElementById("grid").innerHTML = '<div class="empty">Could not load dogs.json. Make sure you\'re serving this over HTTP.</div>';
  });
