// DOM Elements
const armorElements = {
  passiveCheck: document.getElementById("armorPassiveCheck"),
  setCheck: document.getElementById("armorSetCheck"),
  sizeCheck: document.getElementById("armorSizeCheck"),
  container: document.getElementById("armorContainer"),
};

// Lists
let armorPassivesList = [...ARMOR_PASSIVES];
let armorSetsList = [...ARMOR_SETS];
let armorSizesList = [...ARMOR_SIZES];
let workingArmorPassivesList = [];
let workingArmorSetsList = [];

// Constants
const ARMOR_TYPES = {
  PASSIVE: "passive",
  SET: "set",
  SIZE: "size",
};

const ARMOR_SIZE_ICONS = {
  light: "bi-shield-minus",
  medium: "bi-shield",
  heavy: "bi-shield-plus",
};

// Get currently selected armor roll type with validation
const getSelectedArmorRollType = () => {
  const armorChecks = [
    {
      type: ARMOR_TYPES.PASSIVE,
      element: armorElements.passiveCheck,
      list: workingArmorPassivesList,
      validate: () => workingArmorPassivesList?.length > 0,
    },
    {
      type: ARMOR_TYPES.SET,
      element: armorElements.setCheck,
      list: workingArmorSetsList,
      validate: () => workingArmorSetsList?.length > 0,
    },
    {
      type: ARMOR_TYPES.SIZE,
      element: armorElements.sizeCheck,
      list: armorSizesList,
      validate: () => armorSizesList?.length > 0,
    },
  ];

  // Find active type
  for (const armorType of armorChecks) {
    if (armorType.element?.classList.contains("active")) {
      // Validate that the list exists and has items
      if (!armorType.validate()) {
        console.warn(`${armorType.type} armor list is empty or unavailable`);
        return null;
      }
      return armorType;
    }
  }

  // Default to passive if nothing is active but passive list exists
  if (workingArmorPassivesList?.length > 0) {
    console.log("No active armor type found, defaulting to passive");
    return armorChecks[0];
  }

  return null;
};

// Roll armor - main function
const rollArmor = async () => {
  if (typeof proTipCounter !== "undefined") {
    proTipCounter += 1;
    if (proTipCounter === 3 && typeof rollProTip === "function") {
      rollProTip();
    }
  }

  const activeArmorType = getSelectedArmorRollType();

  // Handle case where no valid armor type is available
  if (!activeArmorType || !activeArmorType.list?.length) {
    armorElements.container.innerHTML = `
      <div class="col-12 text-center text-white">
        <p>No armor options available with current filters</p>
      </div>
    `;
    return;
  }

  // Roll random armor item
  const randomIndex = Math.floor(Math.random() * activeArmorType.list.length);
  const rolledArmor = activeArmorType.list[randomIndex];

  if (!rolledArmor) {
    console.error("Failed to roll armor - no item selected");
    return;
  }

  // Generate armor image HTML
  const armorImage = await getArmorImageHTML(rolledArmor);

  // Update container
  armorElements.container.innerHTML = `
    <div class="col-2 px-1 d-flex justify-content-center">
      <div class="card itemCards armorLogo" 
        onclick="window.rerollArmor('${rolledArmor.internalName}', 'armor')"
      >
        ${armorImage}
      </div>
    </div>
    <div class="col-10 px-0 d-flex justify-content-start">
      <div class="card-body d-flex align-items-center">
        <p class="card-title text-white">${escapeHtml(rolledArmor.displayName)}</p>
      </div>
    </div>
  `;
};

// Helper: Get armor image HTML
const getArmorImageHTML = async (armor) => {
  if (!armor) return "";

  // Check if it's an armor size (light/medium/heavy)
  if (armor.tags?.includes("ArmorSize")) {
    return await getArmorSizeIcon(armor.internalName);
  }

  // Regular armor or passive
  const armorPath = armor.tags?.includes("ArmorPassive")
    ? "armorpassives"
    : "armor";
  return `
    <img
      src="../images/${armorPath}/${armor.imageURL}"
      class="img-card-top"
      alt="${escapeHtml(armor.displayName)}"
      id="${armor.internalName}-randImage"
    />
  `;
};

// Reroll armor (individual item)
const rerollArmor = async (intName, category) => {
  const armorDiv = armorElements.container.querySelector(".armorLogo");
  if (!armorDiv) return;

  const activeArmorType = getSelectedArmorRollType();
  if (!activeArmorType || !activeArmorType.list?.length) return;

  // Get current armor to avoid rerolling same item (optional)
  let newArmor = null;
  let attempts = 0;
  const maxAttempts = 50;

  while (
    (!newArmor || newArmor.internalName === intName) &&
    attempts < maxAttempts
  ) {
    const randomIndex = Math.floor(Math.random() * activeArmorType.list.length);
    newArmor = activeArmorType.list[randomIndex];
    attempts++;
  }

  if (!newArmor) return;

  // Update the display
  const armorImage = await getArmorImageHTML(newArmor);
  const imageElement = armorDiv.querySelector("img, i");

  if (imageElement) {
    // Replace the existing image/icon
    if (newArmor.tags?.includes("ArmorSize")) {
      // It's an armor size icon
      const newIcon = await getArmorSizeIcon(newArmor.internalName);
      armorDiv.innerHTML = newIcon;
    } else {
      // It's a regular image
      const img = document.createElement("img");
      const armorPath = newArmor.tags?.includes("ArmorPassive")
        ? "armorpassives"
        : "armor";
      img.src = `../images/${armorPath}/${newArmor.imageURL}`;
      img.className = "img-card-top";
      img.alt = newArmor.displayName;
      img.id = `${newArmor.internalName}-randImage`;

      // Replace the image
      if (imageElement.tagName === "IMG") {
        imageElement.src = img.src;
        imageElement.alt = img.alt;
        imageElement.id = img.id;
      } else {
        armorDiv.innerHTML = img.outerHTML;
      }
    }

    // Update the name text
    const nameElement = armorElements.container.querySelector(".card-title");
    if (nameElement) {
      nameElement.textContent = newArmor.displayName;
    }

    // Update onclick handler
    armorDiv.setAttribute(
      "onclick",
      `window.rerollArmor('${newArmor.internalName}', 'armor')`,
    );
  }
};

// Make rerollArmor available globally
window.rerollArmor = rerollArmor;

// Set armor roll type (called from UI buttons)
const setArmorRollType = (type) => {
  clearActiveArmorRollType();

  switch (type) {
    case ARMOR_TYPES.PASSIVE:
      armorElements.passiveCheck?.classList.add("active");
      break;
    case ARMOR_TYPES.SIZE:
      armorElements.sizeCheck?.classList.add("active");
      break;
    case ARMOR_TYPES.SET:
      armorElements.setCheck?.classList.add("active");
      break;
    default:
      console.warn(`Unknown armor type: ${type}`);
  }

  // Optionally re-roll armor when type changes
  if (typeof rollArmor === "function") {
    rollArmor();
  }
};

// Clear active armor roll type
const clearActiveArmorRollType = () => {
  const armorChecks = [
    armorElements.setCheck,
    armorElements.sizeCheck,
    armorElements.passiveCheck,
  ];

  for (const check of armorChecks) {
    if (check?.classList.contains("active")) {
      check.classList.remove("active");
      break; // Only remove one active class (there should only be one)
    }
  }
};

// Get armor size icon (Bootstrap Icons)
const getArmorSizeIcon = async (size) => {
  const iconClass =
    ARMOR_SIZE_ICONS[size?.toLowerCase()] || ARMOR_SIZE_ICONS.medium;
  return `<i class="armorSizeLogo p-1 d-flex justify-content-center bi ${iconClass}"></i>`;
};

// Update working lists based on warbond filters (call this from main file)
const updateArmorLists = (filteredPassives, filteredSets) => {
  workingArmorPassivesList = filteredPassives || [];
  workingArmorSetsList = filteredSets || [];
};

// Helper: Escape HTML to prevent XSS
const escapeHtml = (text) => {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Initialize armor event listeners
const initArmorEventListeners = () => {
  // Add click handlers for armor type buttons
  if (armorElements.passiveCheck) {
    armorElements.passiveCheck.addEventListener("click", () =>
      setArmorRollType(ARMOR_TYPES.PASSIVE),
    );
  }
  if (armorElements.setCheck) {
    armorElements.setCheck.addEventListener("click", () =>
      setArmorRollType(ARMOR_TYPES.SET),
    );
  }
  if (armorElements.sizeCheck) {
    armorElements.sizeCheck.addEventListener("click", () =>
      setArmorRollType(ARMOR_TYPES.SIZE),
    );
  }
};

// Export/Expose necessary functions if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    rollArmor,
    rerollArmor,
    setArmorRollType,
    updateArmorLists,
    initArmorEventListeners,
  };
}

// Auto-initialize if this is a browser environment
if (typeof window !== "undefined") {
  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArmorEventListeners);
  } else {
    initArmorEventListeners();
  }
}
