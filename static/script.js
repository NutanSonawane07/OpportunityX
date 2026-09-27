/* =========================================================
   OPPORTUNITYX
   STUDENT OPPORTUNITY INTELLIGENCE
========================================================= */


/* =========================================================
   STATE
========================================================= */

let opportunities = [];

let savedOpportunities =
    JSON.parse(
        localStorage.getItem("opportunityXSaved") || "[]"
    );

let studentProfile =
    JSON.parse(
        localStorage.getItem("opportunityXProfile") ||
        JSON.stringify({
            name: "",
            branch: "",
            cgpa: "",
            interest: "",
            skills: []
        })
    );


/* =========================================================
   DOM
========================================================= */

const $ = (id) =>
    document.getElementById(id);


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast = $("toast");
    const messageElement = $("toastMessage");

    if (!toast || !messageElement) {
        return;
    }

    messageElement.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


/* =========================================================
   LOAD OPPORTUNITIES
========================================================= */

async function loadOpportunities() {

    try {

        const response =
            await fetch("/api/opportunities");

        if (!response.ok) {

            throw new Error(
                "Failed to load opportunities"
            );

        }

        opportunities =
            await response.json();


        renderDashboard();

        renderAllOpportunities();

        renderSavedOpportunities();

        updateAllStats();

        updateDNA();

    }

    catch (error) {

        console.error(error);

        $("recommendationsContainer").innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    !
                </div>

                <h3>
                    Could not load opportunities
                </h3>

                <p>
                    Check that Flask is running and refresh
                    the page.
                </p>

            </div>

        `;

    }

}


/* =========================================================
   PROFILE
========================================================= */

function loadProfile() {

    $("studentName").value =
        studentProfile.name || "";

    $("studentBranch").value =
        studentProfile.branch || "";

    $("studentCGPA").value =
        studentProfile.cgpa || "";

    $("studentInterest").value =
        studentProfile.interest || "";

    $("studentSkills").value =
        Array.isArray(studentProfile.skills)
            ? studentProfile.skills.join(", ")
            : "";

}


function saveProfile(event) {

    event.preventDefault();

    const name =
        $("studentName").value.trim();

    const branch =
        $("studentBranch").value;

    const cgpa =
        $("studentCGPA").value;

    const interest =
        $("studentInterest").value;

    const skills =
        $("studentSkills")
            .value
            .split(",")
            .map(skill => skill.trim())
            .filter(Boolean);


    // Check empty fields
    if (
        !name ||
        !branch ||
        !cgpa ||
        !interest ||
        skills.length === 0
    ) {

        showToast(
            "Please complete all profile fields before saving."
        );

        return;
    }


    // Check CGPA
    const cgpaNumber = Number(cgpa);

    if (
        isNaN(cgpaNumber) ||
        cgpaNumber < 0 ||
        cgpaNumber > 10
    ) {

        showToast(
            "Please enter a valid CGPA between 0 and 10."
        );

        return;
    }


    // Save profile
    studentProfile = {

        name: name,

        branch: branch,

        cgpa: cgpa,

        interest: interest,

        skills: skills

    };


    localStorage.setItem(
        "opportunityXProfile",
        JSON.stringify(studentProfile)
    );


    // Update dashboard
    updateAllStats();

    updateDNA();

    renderDashboard();


    showToast(
        "Profile saved successfully."
    );

}

/* =========================================================
   READINESS
========================================================= */

function calculateReadiness() {

    let score = 0;


    if (studentProfile.name)
        score += 20;


    if (studentProfile.branch)
        score += 20;


    if (studentProfile.cgpa)
        score += 20;


    if (studentProfile.interest)
        score += 20;


    if (
        studentProfile.skills &&
        studentProfile.skills.length
    )
        score += 20;


    return score;

}


/* =========================================================
   MATCH ENGINE
========================================================= */

function calculateMatch(opportunity) {

    let score = 0;


    const interest =
        (studentProfile.interest || "")
            .toLowerCase();


    const skills =
        studentProfile.skills || [];


    const searchableText = [

        opportunity.title,
        opportunity.organization,
        opportunity.category,
        opportunity.description,

        ...(opportunity.skills || [])

    ]
        .join(" ")
        .toLowerCase();


    /* Interest */

    if (
        interest &&
        searchableText.includes(interest)
    ) {

        score += 35;

    }


    /* Skills */

    let skillMatches = 0;


    skills.forEach(skill => {

        if (
            searchableText.includes(
                skill.toLowerCase()
            )
        ) {

            skillMatches++;

        }

    });


    score += Math.min(
        40,
        skillMatches * 10
    );


    /* Category */

    if (
        interest &&
        opportunity.category &&
        opportunity.category
            .toLowerCase()
            .includes(
                interest.split(" ")[0]
                    .toLowerCase()
            )
    ) {

        score += 15;

    }


    /* CGPA */

    if (
        opportunity.min_cgpa &&
        studentProfile.cgpa
    ) {

        if (
            Number(studentProfile.cgpa) >=
            Number(opportunity.min_cgpa)
        ) {

            score += 10;

        }

    }
    else {

        score += 5;

    }


    return Math.min(
        100,
        Math.round(score)
    );

}


/* =========================================================
   DEADLINES
========================================================= */

function daysRemaining(opportunity) {

    if (!opportunity.deadline) {
        return null;
    }


    const deadline =
        new Date(
            opportunity.deadline
        );


    const now =
        new Date();


    const difference =
        deadline - now;


    return Math.ceil(
        difference /
        (1000 * 60 * 60 * 24)
    );

}


function deadlineText(opportunity) {

    const days =
        daysRemaining(opportunity);


    if (days === null)
        return "Deadline not specified";


    if (days < 0)
        return "Closed";


    if (days === 0)
        return "Closes today";


    if (days === 1)
        return "1 day left";


    return `${days} days left`;

}


function isClosingSoon(opportunity) {

    const days =
        daysRemaining(opportunity);


    return (
        days !== null &&
        days >= 0 &&
        days <= 7
    );

}


/* =========================================================
   SAVED
========================================================= */

function isSaved(id) {

    return savedOpportunities
        .map(String)
        .includes(String(id));

}


function toggleSave(id) {

    if (isSaved(id)) {

        savedOpportunities =
            savedOpportunities.filter(
                saved =>
                    String(saved) !==
                    String(id)
            );


        showToast(
            "Removed from saved."
        );

    }

    else {

        savedOpportunities.push(id);

        showToast(
            "Opportunity saved."
        );

    }


    localStorage.setItem(
        "opportunityXSaved",
        JSON.stringify(
            savedOpportunities
        )
    );


    updateAllStats();

    renderDashboard();

    renderAllOpportunities();

    renderSavedOpportunities();

}


/* =========================================================
   OPPORTUNITY CARD
========================================================= */

function createOpportunityCard(opportunity) {

    const match =
        calculateMatch(opportunity);


    const saved =
        isSaved(opportunity.id);


    const closing =
        isClosingSoon(opportunity);


    const skills =
        opportunity.skills || [];


    return `

        <article
            class="opportunity-card"
            data-id="${opportunity.id}">


            <div class="card-top">

                <span class="category-badge">

                    ${escapeHTML(
                        opportunity.category
                    )}

                </span>


                <button
                    class="save-button
                    ${saved ? "saved" : ""}"
                    data-action="save"
                    data-id="${opportunity.id}">

                    ${saved ? "♥" : "♡"}

                </button>

            </div>


            <div class="organization">

                ${escapeHTML(
                    opportunity.organization
                )}

            </div>


            <h3>

                ${escapeHTML(
                    opportunity.title
                )}

            </h3>


            <p class="opportunity-description">

                ${escapeHTML(
                    truncate(
                        opportunity.description,
                        115
                    )
                )}

            </p>


            <div class="opportunity-meta">

                <span>
                    ◇
                    ${escapeHTML(
                        opportunity.mode
                    )}
                </span>

                <span>
                    ◷
                    ${escapeHTML(
                        deadlineText(opportunity)
                    )}
                </span>

            </div>


            <div class="skill-tags">

                ${skills
                    .slice(0, 3)
                    .map(skill => `
                        <span>
                            ${escapeHTML(skill)}
                        </span>
                    `)
                    .join("")
                }

            </div>


            <div class="match-section">

                <div class="match-header">

                    <span>
                        PROFILE MATCH
                    </span>

                    <strong>
                        ${match}%
                    </strong>

                </div>


                <div class="match-bar">

                    <div
                        class="match-fill"
                        style="width:${match}%">
                    </div>

                </div>

            </div>


            <div class="card-bottom">

                <span
                    class="deadline-status
                    ${closing ? "closing" : ""}">

                    ${closing ? "● " : ""}

                    ${escapeHTML(
                        deadlineText(opportunity)
                    )}

                </span>


                <button
                    type="button"
                    class="details-button"
                    data-action="details"
                    data-id="${opportunity.id}">

                    View Details →

                </button>

            </div>

        </article>

    `;

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    const container =
        $("recommendationsContainer");


    if (!container)
        return;


    const ranked =
        [...opportunities]

            .sort(
                (a, b) =>
                    calculateMatch(b) -
                    calculateMatch(a)
            )

            .slice(0, 6);


    if (!ranked.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ✦
                </div>

                <h3>
                    Building your radar
                </h3>

                <p>
                    Loading opportunities...
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        ranked
            .map(createOpportunityCard)
            .join("");

}


/* =========================================================
   ALL OPPORTUNITIES
========================================================= */

function renderAllOpportunities() {

    const container =
        $("allOpportunitiesContainer");


    if (!container)
        return;


    const search =
        (
            $("searchInput")?.value ||
            ""
        )
        .toLowerCase()
        .trim();


    const category =
        $("categoryFilter")?.value ||
        "";


    const mode =
        $("modeFilter")?.value ||
        "";


    const filtered =
        opportunities.filter(
            opportunity => {


                const searchableText = [

                    opportunity.title,
                    opportunity.organization,
                    opportunity.category,
                    opportunity.description,
                    ...(opportunity.skills || [])

                ]
                    .join(" ")
                    .toLowerCase();


                return (

                    (
                        !search ||
                        searchableText.includes(
                            search
                        )
                    )

                    &&

                    (
                        !category ||
                        opportunity.category ===
                        category
                    )

                    &&

                    (
                        !mode ||
                        opportunity.mode ===
                        mode
                    )

                );

            }
        );


    if (!filtered.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⌕
                </div>

                <h3>
                    No opportunities found
                </h3>

                <p>
                    Try another search or filter.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        filtered
            .map(createOpportunityCard)
            .join("");

}


/* =========================================================
   SAVED PAGE
========================================================= */

function renderSavedOpportunities() {

    const container =
        $("savedContainer");


    if (!container)
        return;


    const saved =
        opportunities.filter(
            opportunity =>
                isSaved(
                    opportunity.id
                )
        );


    if (!saved.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ♡
                </div>

                <h3>
                    No saved opportunities
                </h3>

                <p>
                    Save opportunities to build
                    your shortlist.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        saved
            .map(createOpportunityCard)
            .join("");

}


/* =========================================================
   RADAR
========================================================= */

function updateRadar() {

    const readiness =
        calculateReadiness();


    const matches =
        opportunities.filter(
            opportunity =>
                calculateMatch(
                    opportunity
                ) >= 60
        ).length;


    const closing =
        opportunities.filter(
            isClosingSoon
        ).length;


    const unlocks =
        opportunities.filter(
            opportunity => {

                const match =
                    calculateMatch(
                        opportunity
                    );

                return (
                    match >= 30 &&
                    match < 60
                );

            }
        ).length;


    $("readinessScore")
        .textContent =
        `${readiness}%`;


    $("radarScore")
        .textContent =
        `${readiness}%`;


    $("readinessProgress")
        .style.width =
        `${readiness}%`;


    $("radarMatches")
        .textContent =
        matches;


    $("radarClosing")
        .textContent =
        closing;


    $("radarUnlock")
        .textContent =
        unlocks;

}


/* =========================================================
   STATS
========================================================= */

function updateAllStats() {

    const matched =
        opportunities.filter(
            opportunity =>
                calculateMatch(
                    opportunity
                ) >= 60
        ).length;


    const closing =
        opportunities.filter(
            isClosingSoon
        ).length;


    const skills =
        studentProfile.skills?.length || 0;


    $("matchedCount")
        .textContent =
        matched;


    $("closingCount")
        .textContent =
        closing;


    $("savedStat")
        .textContent =
        savedOpportunities.length;


    $("savedCount")
        .textContent =
        savedOpportunities.length;


    $("skillsCount")
        .textContent =
        skills;


    updateRadar();

}


/* =========================================================
   DNA
========================================================= */

function updateDNA() {

    const interest =
        studentProfile.interest ||
        "Not set";


    const skills =
        studentProfile.skills?.length ||
        0;


    const readiness =
        calculateReadiness();


    $("dnaInterest")
        .textContent =
        interest;


    $("dnaSkills")
        .textContent =
        `${skills} skill${skills === 1 ? "" : "s"}`;


    $("dnaAccess")
        .textContent =
        `${readiness}%`;

}


/* =========================================================
   WHAT IF
========================================================= */

function simulateSkill() {

    const input =
        $("whatIfSkill");


    const result =
        $("whatIfResult");


    const skill =
        input.value.trim();


    if (!skill) {

        result.textContent =
            "Enter a skill to simulate your opportunity unlock.";

        return;

    }


    const simulated =
        [...(studentProfile.skills || []), skill];


    const unique =
        [...new Set(
            simulated.map(
                item =>
                    item.toLowerCase()
            )
        )];


    const matches =
        opportunities.filter(
            opportunity => {

                const text = [

                    opportunity.title,
                    opportunity.description,
                    ...(opportunity.skills || [])

                ]
                    .join(" ")
                    .toLowerCase();


                return unique.some(
                    item =>
                        text.includes(item)
                );

            }
        );


    result.innerHTML = `

        Adding

        <strong>
            ${escapeHTML(skill)}
        </strong>

        could connect your profile with

        <strong>
            ${matches.length}
        </strong>

        opportunities in the current
        opportunity universe.

    `;

}


/* =========================================================
   MODAL
========================================================= */

function openModal(id) {

    const opportunity =
        opportunities.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!opportunity) {

        showToast(
            "Opportunity not found."
        );

        return;

    }


    const match =
        calculateMatch(
            opportunity
        );


    const saved =
        isSaved(
            opportunity.id
        );


    const skills =
        opportunity.skills || [];


    $("modalBody").innerHTML = `

        <div class="modal-category">

            ${escapeHTML(
                opportunity.category
            )}

        </div>


        <h2>

            ${escapeHTML(
                opportunity.title
            )}

        </h2>


        <p class="modal-organization">

            ${escapeHTML(
                opportunity.organization
            )}

        </p>


        <div class="modal-match">

            <span>
                PROFILE MATCH
            </span>

            <strong>
                ${match}%
            </strong>

        </div>


        <div class="modal-grid">

            <div>

                <span>
                    MODE
                </span>

                <strong>
                    ${escapeHTML(
                        opportunity.mode
                    )}
                </strong>

            </div>


            <div>

                <span>
                    DEADLINE
                </span>

                <strong>
                    ${escapeHTML(
                        deadlineText(
                            opportunity
                        )
                    )}
                </strong>

            </div>


            <div>

                <span>
                    LOCATION
                </span>

                <strong>
                    ${escapeHTML(
                        opportunity.location
                    )}
                </strong>

            </div>


            <div>

                <span>
                    MIN CGPA
                </span>

                <strong>
                    ${escapeHTML(
                        opportunity.min_cgpa
                    )}
                </strong>

            </div>

        </div>


        <div class="modal-description">

            <h3>
                About this opportunity
            </h3>

            <p>

                ${escapeHTML(
                    opportunity.description
                )}

            </p>

        </div>


        <div class="modal-skills">

            <h3>
                Relevant Skills
            </h3>

            <div class="skill-tags">

                ${skills
                    .map(skill => `
                        <span>
                            ${escapeHTML(skill)}
                        </span>
                    `)
                    .join("")
                }

            </div>

        </div>


        <div class="modal-actions">

            <button
                class="button button-secondary"
                data-modal-save="${opportunity.id}">

                ${saved
                    ? "♥ Saved"
                    : "♡ Save Opportunity"
                }

            </button>


            <a
                class="button button-primary"
                href="${escapeAttribute(
                    opportunity.link
                )}"
                target="_blank"
                rel="noopener noreferrer">

                Visit Opportunity →

            </a>

        </div>

    `;


    $("opportunityModal")
        .classList.add("show");


    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    $("opportunityModal")
        .classList.remove("show");


    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function showView(view) {

    const dashboard =
        $("dashboardView");

    const opportunitiesPage =
        $("opportunitiesView");

    const savedPage =
        $("savedView");


    dashboard.style.display =
        view === "dashboard"
            ? "block"
            : "none";


    opportunitiesPage.style.display =
        view === "opportunities"
            ? "block"
            : "none";


    savedPage.style.display =
        view === "saved"
            ? "block"
            : "none";


    document
        .querySelectorAll(
            ".side-nav-button"
        )
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    if (view === "dashboard") {

        $("dashboardNav")
            .classList.add("active");

    }


    if (view === "opportunities") {

        $("opportunitiesNav")
            .classList.add("active");

        renderAllOpportunities();

    }


    if (view === "saved") {

        $("savedNav")
            .classList.add("active");

        renderSavedOpportunities();

    }


    const currentPage =
        $("currentPage");


    if (currentPage) {

        currentPage.textContent =
            view === "dashboard"
                ? "Dashboard"
                : view === "opportunities"
                    ? "Opportunities"
                    : "Saved";

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   EVENT DELEGATION
   THIS FIXES VIEW DETAILS
========================================================= */

document.addEventListener(
    "click",
    event => {


        /* View Details */

        const detailsButton =
            event.target.closest(
                '[data-action="details"]'
            );


        if (detailsButton) {

            const id =
                detailsButton.dataset.id;


            openModal(id);

            return;

        }


        /* Save */

        const saveButton =
            event.target.closest(
                '[data-action="save"]'
            );


        if (saveButton) {

            const id =
                saveButton.dataset.id;


            toggleSave(id);

            return;

        }


        /* Modal save */

        const modalSave =
            event.target.closest(
                "[data-modal-save]"
            );


        if (modalSave) {

            const id =
                modalSave.dataset.modalSave;


            toggleSave(id);

            openModal(id);

            return;

        }

    }
);


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        loadProfile();


        /* Navigation */

        $("dashboardNav")
            .addEventListener(
                "click",
                () =>
                    showView(
                        "dashboard"
                    )
            );


        $("opportunitiesNav")
            .addEventListener(
                "click",
                () =>
                    showView(
                        "opportunities"
                    )
            );


        $("savedNav")
            .addEventListener(
                "click",
                () =>
                    showView(
                        "saved"
                    )
            );


        $("profileNav")
            .addEventListener(
                "click",
                () => {

                    showView(
                        "dashboard"
                    );


                    setTimeout(() => {

                        $("profileSection")
                            .scrollIntoView({
                                behavior:
                                    "smooth"
                            });

                    }, 100);

                }
            );


        /* Hero */

        $("viewAllButton")
            .addEventListener(
                "click",
                () =>
                    showView(
                        "opportunities"
                    )
            );


        $("completeProfileButton")
            .addEventListener(
                "click",
                () => {

                    showView(
                        "dashboard"
                    );


                    setTimeout(() => {

                        $("profileSection")
                            .scrollIntoView({
                                behavior:
                                    "smooth"
                            });

                    }, 100);

                }
            );


        $("recommendationsViewAll")
            .addEventListener(
                "click",
                () =>
                    showView(
                        "opportunities"
                    )
            );


        /* Profile */

        $("profileForm")
            .addEventListener(
                "submit",
                saveProfile
            );


        /* Search */

        $("searchInput")
            .addEventListener(
                "input",
                renderAllOpportunities
            );


        $("categoryFilter")
            .addEventListener(
                "change",
                renderAllOpportunities
            );


        $("modeFilter")
            .addEventListener(
                "change",
                renderAllOpportunities
            );


        /* What If */

        $("whatIfButton")
            .addEventListener(
                "click",
                simulateSkill
            );


        $("whatIfSkill")
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        simulateSkill();

                    }

                }
            );


        /* Modal close */

        $("modalClose")
            .addEventListener(
                "click",
                closeModal
            );


        $("opportunityModal")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        $("opportunityModal")
                    ) {

                        closeModal();

                    }

                }
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeModal();

                }

            }
        );


        /* Load */

        loadOpportunities();

    }
);


/* =========================================================
   UTILITIES
========================================================= */

function truncate(
    text,
    length
) {

    if (!text)
        return "";

    if (
        text.length <= length
    )
        return text;

    return (
        text.substring(
            0,
            length
        ) + "..."
    );

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );

}