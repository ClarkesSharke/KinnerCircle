// ======================================================

// KinnerCircle

// Supabase-connected web beta

// ======================================================

const APP = document.getElementById("app");

let supabaseClient = null;

let currentUser = null;

let currentFamily = null;
let passwordRecoveryActive = false;


const STORAGE_URL = "kinnercircle_supabase_url";

const STORAGE_KEY = "kinnercircle_supabase_publishable_key";
const DEFAULT_SUPABASE_URL = "https://qkvifrbabshbgkcznavq.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_kXEIDuKCaW5QXVsrsNsTOg_WNYg8J_c";


// ------------------------------------------------------

// START

// ------------------------------------------------------

start();

async function start() {
  

  const url = localStorage.getItem(STORAGE_URL) || DEFAULT_SUPABASE_URL;

  const key = localStorage.getItem(STORAGE_KEY) || DEFAULT_SUPABASE_KEY;

  if (!url || !key) {

    showConnectionSetup();

    return;

  }

  try {

    supabaseClient = window.supabase.createClient(url, key);
    

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    passwordRecoveryActive = true;
    showResetPassword();
  }
});

    const {

      data: { session },

    } = await supabaseClient.auth.getSession();
    const recoveryRequested =
  new URLSearchParams(window.location.search).get("recovery") === "1";

if (recoveryRequested && session) {
  passwordRecoveryActive = true;
  showResetPassword();
  return;
}
    if (passwordRecoveryActive) {
  return;
}

    if (!session) {

      showLogin();

      return;

    }

    currentUser = session.user;

    await loadKinnerCircle();

  } catch (error) {

    console.error(error);

    showConnectionSetup(`Could not connect to Supabase: ${error.message}`);

  }

}

// ------------------------------------------------------

// SUPABASE SETUP

// ------------------------------------------------------

function showConnectionSetup(message = "") {

  APP.innerHTML = `

    <div class="kc-page kc-center">

      <div class="kc-logo">K</div>

      <h1>KinnerCircle</h1>

      <p class="kc-muted">Your family. Your inner circle.</p>

      <div class="kc-card kc-form-card">

        <h2>Connect KinnerCircle</h2>

        ${

          message

            ? `<div class="kc-error">${escapeHtml(message)}</div>`

            : ""

        }

        <label>Supabase Project URL</label>

        <input

          id="supabase-url"

          type="text"

          placeholder="https://yourproject.supabase.co"

          autocomplete="off"

        />

        <label>Publishable key</label>

        <textarea

          id="supabase-key"

          rows="4"

          placeholder="sb_publishable_..."

        ></textarea>

        <button class="kc-primary" id="save-connection">

          Connect

        </button>

        <p class="kc-small">

          Use only the Supabase Publishable key. Never use a secret or service_role key here.

        </p>

      </div>

    </div>

  `;

  injectAppStyles();

  document

    .getElementById("save-connection")

    .addEventListener("click", () => {

      const url = document

        .getElementById("supabase-url")

        .value.trim();

      const key = document

        .getElementById("supabase-key")

        .value.trim();

      if (!url || !key) {

        alert("Enter both the Project URL and Publishable key.");

        return;

      }

      localStorage.setItem(STORAGE_URL, url);

      localStorage.setItem(STORAGE_KEY, key);

      location.reload();

    });

}

// ------------------------------------------------------

// AUTH

// ------------------------------------------------------

function showLogin() {

  APP.innerHTML = `

    <div class="kc-page kc-center">

      <div class="kc-logo">K</div>

      <h1>KinnerCircle</h1>

      <p class="kc-muted">Your family. Your inner circle.</p>

      <div class="kc-card kc-form-card">

        <div class="kc-tabs">

          <button id="login-tab" class="active">Sign In</button>

          <button id="signup-tab">Create Account</button>

        </div>

        <div id="auth-message"></div>

        <label>Email</label>

        <input id="email" type="email" placeholder="you@example.com" />

        <label>Password</label>

        <input id="password" type="password" placeholder="Password" />

        <button class="kc-primary" id="auth-button">

          Sign In

        </button>
        <button type="button" id="forgot-password" class="kc-secondary">Forgot password?</button>

      </div>

    </div>

  `;

  injectAppStyles();

  let mode = "login";

  const loginTab = document.getElementById("login-tab");

  const signupTab = document.getElementById("signup-tab");

  const button = document.getElementById("auth-button");
  const forgotPassword = document.getElementById("forgot-password");
  forgotPassword.onclick = async () => {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    document.getElementById("auth-message").textContent = "Enter your email first.";
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
redirectTo: "https://clarkessharke.github.io/KinnerCircle/?recovery=1",
  });

  document.getElementById("auth-message").textContent =
    error ? error.message : "Password reset email sent.";
};

  loginTab.onclick = () => {

    mode = "login";

    loginTab.classList.add("active");

    signupTab.classList.remove("active");

    button.textContent = "Sign In";

  };

  signupTab.onclick = () => {

    mode = "signup";

    signupTab.classList.add("active");

    loginTab.classList.remove("active");

    button.textContent = "Create Account";

  };

  button.onclick = async () => {

    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;

    if (!email || !password) {

      showAuthMessage("Enter an email and password.");

      return;

    }

    button.disabled = true;

    try {

      if (mode === "signup") {

        const { data, error } =

          await supabaseClient.auth.signUp({

            email,

            password,

            options: {

              data: {

                display_name: email.split("@")[0],

              },

            },

          });

        if (error) throw error;

        if (!data.session) {

          showAuthMessage(

            "Account created. Check your email to confirm your account."

          );

        } else {

          currentUser = data.user;

          await loadKinnerCircle();

        }

      } else {

        const { data, error } =

          await supabaseClient.auth.signInWithPassword({

            email,

            password,

          });

        if (error) throw error;

        currentUser = data.user;

        await loadKinnerCircle();

      }

    } catch (error) {

      showAuthMessage(error.message);

    } finally {

      button.disabled = false;

    }

  };

}


  function showResetPassword() {
  APP.innerHTML = `
    <div class="kc-page kc-center">
      <div class="kc-logo">K</div>
      <h1>KinnerCircle</h1>
      <p class="kc-muted">Choose your new password.</p>

      <div class="kc-card kc-form-card">
        <div id="reset-message"></div>

        <label>New password</label>
        <input id="new-password" type="password" placeholder="New password" />

        <label>Confirm password</label>
        <input id="confirm-password" type="password" placeholder="Confirm password" />

        <button class="kc-primary" id="save-new-password">
          Save New Password
        </button>
      </div>
    </div>
  `;

  injectAppStyles();

  document.getElementById("save-new-password").onclick = async () => {
    const password = document.getElementById("new-password").value;
    const confirmPassword =
      document.getElementById("confirm-password").value;

    if (!password || password !== confirmPassword) {
      document.getElementById("reset-message").innerHTML =
        '<div class="kc-error">Passwords must match.</div>';
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({
      password,
    });

    if (error) {
      document.getElementById("reset-message").innerHTML =
        `<div class="kc-error">${escapeHtml(error.message)}</div>`;
      return;
    }

    passwordRecoveryActive = false;
    await supabaseClient.auth.signOut();
    window.history.replaceState({}, document.title, window.location.pathname);
    showLogin();
    showAuthMessage("Password changed. Sign in with your new password.");
  };
}
function showAuthMessage(message) {
  document.getElementById(

    "auth-message"

  ).innerHTML = `<div class="kc-error">${escapeHtml(message)}</div>`;

}

// ------------------------------------------------------

// LOAD FAMILY

// ------------------------------------------------------

async function loadKinnerCircle() {

  const { data: memberships, error } = await supabaseClient

    .from("family_members")

    .select(`

      role,

      families (

        family_id,

        family_name,

        default_dinner_time

      )

    `)

    .eq("user_id", currentUser.id);

  if (error) {

    console.error(error);

    showMainError(error.message);

    return;

  }

  if (!memberships || memberships.length === 0) {

    showCreateFamily();

    return;

  }

  currentFamily = memberships[0].families;

  renderApp();

}

// ------------------------------------------------------

// CREATE FAMILY

// ------------------------------------------------------

function showCreateFamily() {

  APP.innerHTML = `

    <div class="kc-page kc-center">

      <div class="kc-logo">K</div>

      <h1>Welcome to KinnerCircle</h1>

      <p class="kc-muted">

        Create your family's private circle.

      </p>

      <div class="kc-card kc-form-card">

        <label>Family name</label>

        <input

          id="family-name"

          value="Our Family"

          type="text"

        />

        <button

          id="create-family"

          class="kc-primary"

        >

          Create Family

        </button>

      </div>

    </div>

  `;

  injectAppStyles();

  document

    .getElementById("create-family")

    .onclick = async () => {

      const familyName =

        document.getElementById("family-name").value.trim();

      if (!familyName) return;

      const { data: family, error } =

        await supabaseClient

          .from("families")

          .insert({

            family_name: familyName,

            created_by: currentUser.id,

          })

          .select()

          .single();

      if (error) {

        alert(error.message);

        return;

      }

      const { error: memberError } =

        await supabaseClient

          .from("family_members")

          .insert({

            family_id: family.family_id,

            user_id: currentUser.id,

            role: "owner",

          });

      if (memberError) {

        alert(memberError.message);

        return;

      }

      currentFamily = family;

      renderApp();

    };

}

// ------------------------------------------------------

// MAIN APP

// ------------------------------------------------------

function renderApp() {

  APP.innerHTML = `

    <div class="kc-shell">

      <header class="kc-header">

        <div>

          <div class="kc-brand">KinnerCircle</div>

          <div class="kc-tagline">

            Your family. Your inner circle.

          </div>

        </div>

        <button

          class="kc-avatar"

          id="profile-button"

        >

          ${getInitial(currentUser.email)}

        </button>

      </header>

      <main id="kc-content"></main>

      <nav class="kc-nav">

        <button data-page="home" class="active">

          🏠

          <span>Home</span>

        </button>

        <button data-page="week">

          🍽️

          <span>Week</span>

        </button>

        <button data-page="calendar">

          📅

          <span>Calendar</span>

        </button>

        <button data-page="meals">

          ❤️

          <span>Meals</span>

        </button>

        <button data-page="groceries">

          🛒

          <span>Groceries</span>

        </button>

      </nav>

    </div>

  `;

  injectAppStyles();

  document

    .querySelectorAll(".kc-nav button")

    .forEach((button) => {

      button.onclick = () => {

        document

          .querySelectorAll(".kc-nav button")

          .forEach((b) =>

            b.classList.remove("active")

          );

        button.classList.add("active");

        openPage(button.dataset.page);

      };

    });

  document.getElementById("profile-button").onclick =

    showProfileMenu;

  openPage("home");

}

function openPage(page) {

  if (page === "home") loadHome();

  if (page === "week") loadWeek();

  if (page === "calendar") loadCalendar();

  if (page === "meals") loadMeals();

  if (page === "groceries") loadGroceries();

}

// ------------------------------------------------------

// HOME

// ------------------------------------------------------

async function loadHome() {

  const content = document.getElementById("kc-content");

  content.innerHTML = `

    <div class="kc-content">

      <h1>Home</h1>

      <p class="kc-muted">Loading today...</p>

    </div>

  `;

  const today = localDateString();
  const { data: familyMembers, error: familyMembersError } =
  await supabaseClient
    .from("family_members")
    .select("user_id, role, profiles(display_name)")
    .eq("family_id", currentFamily.family_id);

  const { data: meal, error } =

    await supabaseClient

      .from("meals")

      .select("*")

      .eq("family_id", currentFamily.family_id)

      .eq("meal_date", today)

      .eq("meal_type", "Dinner")

      .maybeSingle();
  const startOfDay = `${today}T00:00:00`;
const endOfDay = `${today}T23:59:59`;

const { data: todayEvents } =
  await supabaseClient
    .from("calendar_events")
    .select("*")
    .eq("family_id", currentFamily.family_id)
    .gte("start_at", startOfDay)
    .lte("start_at", endOfDay)
    .order("start_at");

  if (error) {

    console.error(error);

  }

  content.innerHTML = `

    <div class="kc-content">

      <h1>Home</h1>

      <p class="kc-muted">

        ${formatToday()}

      </p>

      ${

        meal

          ? dinnerCard(meal)

          : `

            <div class="kc-card kc-dinner-card">

              <div class="kc-eyebrow">

              THIS KIBBLE SLAPS

              </div>

              <h2>Nothing planned yet</h2>

              <button

                id="add-tonight-meal"

                class="kc-primary"

              >

                Add Tonight's Dinner

              </button>

            </div>

          `

      }

      <div class="kc-card">

        <div class="kc-section-title">

          TODAY'S GONG SHOW

        </div>

        <div id="home-today-events"></div>

      </div>

    </div>

  `;
document.getElementById("home-today-events").innerHTML =
  eventListHtml(todayEvents || []);
  document.getElementById("home-family-status").innerHTML =
  (familyMembers || [])
    .map(
      (member) => `
        <div class="kc-family-member">
          <strong>${escapeHtml(member.profiles?.display_name || "Family")}</strong>
        </div>
      `
    )
    .join("");
  if (!meal) {

    document

      .getElementById("add-tonight-meal")

      .onclick = addTonightMeal;

  } else {

    attachAttendanceButtons(meal);

  }

}

function dinnerCard(meal) {

  return `

    <div class="kc-card kc-dinner-card kc-home-meal-card">

      <div class="kc-eyebrow">

      THIS KIBBLE SLAPS

      </div>

      <h2 class="kc-home-meal-name">${escapeHtml(meal.recipe_name)}</h2>

    <div class="kc-dinner-time">🕕 ${formatMealTime(meal.meal_time)}</div>
    <div class="kc-home-plate-count">🍽️ Plate count coming from Who's Forking In?</div>



      </div>
<div class="kc-card kc-home-attendance-card">

      <div class="kc-section-title">

        WHO'S FORKING IN?
        <div class="kc-home-attendance-summary">Family dinner status</div>

      </div>
<div class="kc-home-family-row" id="home-family-status"></div>
      <div class="kc-status-buttons">

        <button

          data-status="Home"

          data-meal="${meal.meal_id}"

        >

          Home

        </button>

        <button

          data-status="Out"

          data-meal="${meal.meal_id}"

        >

          Out

        </button>

        <button

          data-status="Leftover"

          data-meal="${meal.meal_id}"

        >

          Leftover

        </button>

      </div>

      <div id="status-result"></div>

    </div>

  `;

}

async function addTonightMeal() {

  const name = prompt(

    "What's for dinner tonight?"

  );

  if (!name) return;

  const today = localDateString();

  const { error } =

    await supabaseClient

      .from("meals")

      .insert({

        family_id: currentFamily.family_id,

        meal_date: today,

        meal_type: "Dinner",

        meal_time: "18:00",

        recipe_name: name,

        created_by: currentUser.id,

      });

  if (error) {

    alert(error.message);

    return;

  }

  loadHome();

}

function attachAttendanceButtons(meal) {

  document

    .querySelectorAll(".kc-status-buttons button")

    .forEach((button) => {

      button.onclick = async () => {

        const status = button.dataset.status;

        const { error } =

          await supabaseClient

            .from("meal_attendance")

            .upsert(

              {

                meal_id: meal.meal_id,

                user_id: currentUser.id,

                status,

              },

              {

                onConflict: "meal_id,user_id",

              }

            );

        if (error) {

          alert(error.message);

          return;

        }

        document.getElementById(

          "status-result"

        ).innerHTML = `

          <div class="kc-success">

            ✓ Status updated to ${escapeHtml(status)}

          </div>

        `;

      };

    });

}

// ------------------------------------------------------

// WEEK

// ------------------------------------------------------

async function loadWeek() {

  const content = document.getElementById("kc-content");

  const start = new Date();

  const end = new Date();

  end.setDate(start.getDate() + 6);

  const { data: meals, error } =

    await supabaseClient

      .from("meals")

      .select("*")

      .eq("family_id", currentFamily.family_id)

      .gte("meal_date", formatDateForDb(start))

      .lte("meal_date", formatDateForDb(end))

      .order("meal_date");

  content.innerHTML = `

    <div class="kc-content">

      <h1>Weekly Food Plan</h1>

      <p class="kc-muted">

        Plan dinners ahead and reuse saved meals.

      </p>

      <div class="kc-week-list">

        ${

          error

            ? `<div class="kc-error">${escapeHtml(

                error.message

              )}</div>`

            : weeklyMealHtml(meals || [])

        }

      </div>

    </div>

  `;

}

function weeklyMealHtml(meals) {

  const result = [];

  for (let i = 0; i < 7; i++) {

    const date = new Date();

    date.setDate(date.getDate() + i);

    const dbDate = formatDateForDb(date);

    const meal = meals.find(

      (m) => m.meal_date === dbDate

    );

    result.push(`

      <div class="kc-card kc-week-day">

        <div>

          <div class="kc-week-date">

            ${date.toLocaleDateString("en-CA", {

              weekday: "short",

            })}

          </div>

          <div class="kc-week-number">

            ${date.getDate()}

          </div>

        </div>

        <div class="kc-week-meal">

          ${

            meal

              ? escapeHtml(meal.recipe_name)

              : "No dinner planned"

          }

        </div>

      </div>

    `);

  }

  return result.join("");

}

// ------------------------------------------------------

// CALENDAR

// ------------------------------------------------------

async function loadCalendar() {

  const content = document.getElementById("kc-content");

  const { data: events, error } =

    await supabaseClient

      .from("calendar_events")

      .select("*")

      .eq("family_id", currentFamily.family_id)

      .order("start_at");

  content.innerHTML = `

    <div class="kc-content">

      <div class="kc-row-between">

        <div>

          <h1>Calendar</h1>

          <p class="kc-muted">Family schedule</p>

        </div>

        <button

          id="quick-event"

          class="kc-small-button"

        >

          + Event

        </button>

      </div>

      ${

        error

          ? `<div class="kc-error">${escapeHtml(

              error.message

            )}</div>`

          : eventListHtml(events || [])

      }

    </div>

  `;

  document.getElementById(

    "quick-event"

  ).onclick = quickAddEvent;

}

function eventListHtml(events) {

  if (!events.length) {

    return `

      <div class="kc-card">

        <p class="kc-muted">

          No events yet.

        </p>

      </div>

    `;

  }

  return events

    .map(

      (event) => `

      <div class="kc-card">

        <div class="kc-section-title">

          ${escapeHtml(event.event_type)}

        </div>

        <h3>${escapeHtml(event.title)}</h3>

        <p class="kc-muted">

          ${new Date(event.start_at).toLocaleString()}

        </p>

        ${

          event.location

            ? `<p>${escapeHtml(event.location)}</p>`

            : ""

        }

      </div>

    `

    )

    .join("");

}

async function quickAddEvent() {

  const title = prompt("Event name");

  if (!title) return;

  const when = prompt(

    "Date and time (example: 2026-08-25 15:30)"

  );

  if (!when) return;

  const date = new Date(

    when.replace(" ", "T")

  );

  if (Number.isNaN(date.getTime())) {

    alert("That date/time was not recognized.");

    return;

  }

  const { error } =

    await supabaseClient

      .from("calendar_events")

      .insert({

        family_id: currentFamily.family_id,

        title,

        event_type: "Other",

        start_at: date.toISOString(),

        created_by: currentUser.id,

      });

  if (error) {

    alert(error.message);

    return;

  }

  loadCalendar();

}

// ------------------------------------------------------

// MEALS

// ------------------------------------------------------

async function loadMeals() {

  const content = document.getElementById("kc-content");

  const { data: recipes, error } =

    await supabaseClient

      .from("recipes")

      .select("*")

      .eq("family_id", currentFamily.family_id)

      .order("name");

  content.innerHTML = `

    <div class="kc-content">

      <div class="kc-row-between">

        <div>

          <h1>Family Meals</h1>

          <p class="kc-muted">

            Save it once. Use it anytime.

          </p>

        </div>

        <button

          id="add-recipe"

          class="kc-small-button"

        >

          + Meal

        </button>

      </div>

      ${

        error

          ? `<div class="kc-error">${escapeHtml(

              error.message

            )}</div>`

          : recipeListHtml(recipes || [])

      }

    </div>

  `;

  document.getElementById(

    "add-recipe"

  ).onclick = quickAddRecipe;

}

function recipeListHtml(recipes) {

  if (!recipes.length) {

    return `

      <div class="kc-card">

        <p class="kc-muted">

          No saved family meals yet.

        </p>

      </div>

    `;

  }

  return recipes

    .map(

      (recipe) => `

      <div class="kc-card">

        <div class="kc-section-title">

          FAMILY MEAL

        </div>

        <h3>${escapeHtml(recipe.name)}</h3>

        ${

          recipe.calories_per_serving

            ? `

              <p class="kc-muted">

                ${recipe.calories_per_serving} cal

                ·

                ${recipe.protein_g || 0}g protein

              </p>

            `

            : ""

        }

      </div>

    `

    )

    .join("");

}

async function quickAddRecipe() {

  const name = prompt("Meal name");

  if (!name) return;

  const { error } =

    await supabaseClient

      .from("recipes")

      .insert({

        family_id: currentFamily.family_id,

        name,

        base_servings: 4,

        created_by: currentUser.id,

      });

  if (error) {

    alert(error.message);

    return;

  }

  loadMeals();

}

// ------------------------------------------------------

// GROCERIES

// ------------------------------------------------------

async function loadGroceries() {

  const content = document.getElementById("kc-content");

  const { data: items, error } =

    await supabaseClient

      .from("grocery_items")

      .select("*")

      .eq("family_id", currentFamily.family_id)

      .order("created_at");

  content.innerHTML = `

    <div class="kc-content">

      <div class="kc-row-between">

        <div>

          <h1>Groceries</h1>

          <p class="kc-muted">

            Shared family grocery list

          </p>

        </div>

        <button

          id="add-grocery"

          class="kc-small-button"

        >

          + Add

        </button>

      </div>

      ${

        error

          ? `<div class="kc-error">${escapeHtml(

              error.message

            )}</div>`

          : groceryHtml(items || [])

      }

    </div>

  `;

  document.getElementById(

    "add-grocery"

  ).onclick = quickAddGrocery;

  document

    .querySelectorAll("[data-grocery]")

    .forEach((button) => {

      button.onclick = async () => {

        const id = button.dataset.grocery;

        const checked =

          button.dataset.checked === "true";

        await supabaseClient

          .from("grocery_items")

          .update({

            checked: !checked,

          })

          .eq("grocery_item_id", id);

        loadGroceries();

      };

    });

}

function groceryHtml(items) {

  if (!items.length) {

    return `

      <div class="kc-card">

        <p class="kc-muted">

          Grocery list is empty.

        </p>

      </div>

    `;

  }

  return `

    <div class="kc-card">

      ${items

        .map(

          (item) => `

          <button

            class="kc-grocery-row"

            data-grocery="${item.grocery_item_id}"

            data-checked="${item.checked}"

          >

            <span class="kc-checkbox">

              ${item.checked ? "✓" : ""}

            </span>

            <span class="${

              item.checked ? "kc-done" : ""

            }">

              ${escapeHtml(item.item_name)}

            </span>

          </button>

        `

        )

        .join("")}

    </div>

  `;

}

async function quickAddGrocery() {

  const item = prompt("Add grocery item");

  if (!item) return;

  const { error } =

    await supabaseClient

      .from("grocery_items")

      .insert({

        family_id: currentFamily.family_id,

        item_name: item,

        source_type: "manual",

        added_by: currentUser.id,

      });

  if (error) {

    alert(error.message);

    return;

  }

  loadGroceries();

}

// ------------------------------------------------------

// PROFILE / LOGOUT

// ------------------------------------------------------

function showProfileMenu() {

  const logout = confirm(

    `${currentUser.email}\n\nSign out of KinnerCircle?`

  );

  if (!logout) return;

  supabaseClient.auth.signOut().then(() => {

    location.reload();

  });

}

// ------------------------------------------------------

// ERROR

// ------------------------------------------------------

function showMainError(message) {

  APP.innerHTML = `

    <div class="kc-page kc-center">

      <div class="kc-card">

        <h2>KinnerCircle</h2>

        <div class="kc-error">

          ${escapeHtml(message)}

        </div>

        <button

          class="kc-primary"

          onclick="location.reload()"

        >

          Try Again

        </button>

      </div>

    </div>

  `;

  injectAppStyles();

}

// ------------------------------------------------------

// HELPERS

// ------------------------------------------------------

function getInitial(email) {

  return email

    ? email.charAt(0).toUpperCase()

    : "K";

}

function localDateString() {

  return formatDateForDb(new Date());

}

function formatDateForDb(date) {

  const y = date.getFullYear();

  const m = String(

    date.getMonth() + 1

  ).padStart(2, "0");

  const d = String(

    date.getDate()

  ).padStart(2, "0");

  return `${y}-${m}-${d}`;

}

function formatToday() {

  return new Date().toLocaleDateString(

    "en-CA",

    {

      weekday: "long",

      month: "long",

      day: "numeric",

    }

  );

}

function formatMealTime(time) {

  if (!time) return "Dinner";

  const [hourString, minute] =

    time.split(":");

  let hour = Number(hourString);

  const suffix =

    hour >= 12 ? "PM" : "AM";

  hour %= 12;

  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${suffix}`;

}

function escapeHtml(text) {

  if (text === null || text === undefined)

    return "";

  return String(text)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}

// ------------------------------------------------------

// APP STYLES

// ------------------------------------------------------

function injectAppStyles() {

  if (

    document.getElementById(

      "kinnercircle-app-styles"

    )

  ) {

    return;

  }

  const style =

    document.createElement("style");

  style.id =

    "kinnercircle-app-styles";

  style.textContent = `

    .kc-page {

      min-height: 100vh;

      padding: 24px;

      background: #f7f7fb;

    }

    .kc-center {

      display: flex;

      flex-direction: column;

      justify-content: center;

      align-items: center;

      text-align: center;

    }

    .kc-logo {

      width: 78px;

      height: 78px;

      border-radius: 24px;

      background: #5b3fd6;

      color: white;

      display: flex;

      align-items: center;

      justify-content: center;

      font-size: 38px;

      font-weight: 800;

      margin-bottom: 18px;

      box-shadow: 0 12px 30px rgba(91,63,214,.25);

    }

    .kc-muted {

      color: #727282;

      line-height: 1.45;

      margin-top: 5px;

    }

    .kc-small {

      color: #858593;

      font-size: 12px;

      line-height: 1.4;

      margin-top: 14px;

    }

    .kc-card {

      background: white;

      border-radius: 20px;

      padding: 18px;

      margin-top: 16px;

      box-shadow:

        0 2px 10px rgba(0,0,0,.04);

    }

    .kc-form-card {

      width: 100%;

      max-width: 440px;

      text-align: left;

      margin-top: 24px;

    }

    .kc-form-card h2 {

      margin-bottom: 16px;

    }

    label {

      display: block;

      font-size: 12px;

      font-weight: 700;

      margin-top: 14px;

      margin-bottom: 6px;

    }

    input,

    textarea {

      width: 100%;

      padding: 14px;

      border: 1px solid #dedee7;

      background: #f8f8fb;

      border-radius: 12px;

      font-size: 16px;

    }

    .kc-primary {

      width: 100%;

      border: 0;

      background: #5b3fd6;

      color: white;

      padding: 14px;

      border-radius: 13px;

      font-size: 15px;

      font-weight: 800;

      margin-top: 18px;

    }

    .kc-error {

      background: #fff0f0;

      color: #af3434;

      padding: 11px;

      border-radius: 10px;

      margin-bottom: 10px;

      font-size: 13px;

    }

    .kc-success {

      background: #ecf8ef;

      color: #28723c;

      padding: 10px;

      border-radius: 10px;

      margin-top: 12px;

      font-size: 13px;

      font-weight: 700;

    }

    .kc-tabs {

      display: flex;

      background: #f0f0f5;

      padding: 4px;

      border-radius: 12px;

      margin-bottom: 12px;

    }

    .kc-tabs button {

      flex: 1;

      border: 0;

      background: transparent;

      padding: 10px;

      border-radius: 9px;

      font-weight: 700;

    }

    .kc-tabs button.active {

      background: white;

      color: #5b3fd6;

    }

    .kc-shell {

      min-height: 100vh;

      background: #f7f7fb;

      padding-bottom: 78px;

    }

    .kc-header {

      position: sticky;

      top: 0;

      z-index: 10;

      background: rgba(255,255,255,.95);

      backdrop-filter: blur(16px);

      border-bottom: 1px solid #ececf1;

      display: flex;

      align-items: center;

      justify-content: space-between;

      padding:

        max(12px, env(safe-area-inset-top))

        16px

        12px;

    }

    .kc-brand {

      font-size: 20px;

      font-weight: 850;

    }

    .kc-tagline {

      font-size: 10px;

      color: #777787;

      margin-top: 2px;

    }

    .kc-avatar {

      width: 38px;

      height: 38px;

      border: 0;

      border-radius: 50%;

      background: #5b3fd6;

      color: white;

      font-weight: 800;

    }

    .kc-content {

      padding: 18px 16px 30px;

      max-width: 700px;

      margin: auto;

    }

    .kc-content h1 {

      font-size: 30px;

    }

    .kc-nav {

      position: fixed;

      left: 0;

      right: 0;

      bottom: 0;

      display: flex;

      background: rgba(255,255,255,.97);

      border-top: 1px solid #e7e7ed;

      padding:

        8px

        4px

        max(8px, env(safe-area-inset-bottom));

      z-index: 20;

    }

    .kc-nav button {

      flex: 1;

      border: 0;

      background: transparent;

      font-size: 18px;

      color: #888895;

    }

    .kc-nav span {

      display: block;

      font-size: 9px;

      margin-top: 3px;

    }

    .kc-nav button.active {

      color: #5b3fd6;

    }

    .kc-dinner-card {

      background: #18263b;

      color: white;

    }

    .kc-dinner-card .kc-muted {

      color: #d4d9e0;

    }

    .kc-eyebrow,

    .kc-section-title {

      font-size: 10px;

      font-weight: 850;

      letter-spacing: .8px;

      color: #707080;

      margin-bottom: 7px;

    }

    .kc-dinner-card .kc-eyebrow,

    .kc-dinner-card .kc-section-title {

      color: #73df83;

    }

    .kc-dinner-card h2 {

      font-size: 27px;

      margin-top: 6px;

    }

    .kc-dinner-time {

      margin-top: 6px;

      color: #d5dde8;

    }

    .kc-divider {

      height: 1px;

      background: rgba(255,255,255,.12);

      margin: 18px 0;

    }

    .kc-status-buttons {

      display: flex;

      gap: 7px;

    }

    .kc-status-buttons button {

      flex: 1;

      border: 0;

      border-radius: 11px;

      padding: 11px 5px;

      font-weight: 800;

      background: #2a3d56;

      color: white;

    }

    .kc-row-between {

      display: flex;

      justify-content: space-between;

      align-items: center;

      gap: 12px;

    }

    .kc-small-button {

      border: 0;

      background: #5b3fd6;

      color: white;

      border-radius: 11px;

      padding: 10px 13px;

      font-weight: 800;

    }

    .kc-week-day {

      display: flex;

      align-items: center;

      gap: 18px;

    }

    .kc-week-date {

      color: #777785;

      font-size: 11px;

      font-weight: 800;

    }

    .kc-week-number {

      font-size: 22px;

      font-weight: 850;

    }

    .kc-week-meal {

      font-weight: 750;

    }

    .kc-grocery-row {

      width: 100%;

      display: flex;

      gap: 11px;

      align-items: center;

      border: 0;

      border-bottom: 1px solid #efeff3;

      background: white;

      padding: 13px 2px;

      text-align: left;

      font-size: 15px;

    }

    .kc-checkbox {

      width: 23px;

      height: 23px;

      border: 2px solid #aaaab5;

      border-radius: 7px;

      display: flex;

      align-items: center;

      justify-content: center;

      color: #5b3fd6;

      font-weight: 900;

    }

    .kc-done {

      text-decoration: line-through;

      color: #9999a5;

    }

  `;

  document.head.appendChild(style);

}
