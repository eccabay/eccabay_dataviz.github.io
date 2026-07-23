import * as d3 from "d3";

const width = 1400;
const height = 700;

const margin = {
    top: 60,
    right: 120,
    bottom: 70,
    left: 120
};

const bucketLeft = 320;
const bucketRight = 1080;

const DAY = 1000 * 60 * 60 * 24;
const EXIT_DURATION = DAY * 20;

const svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "white");


// ----------------------------------------
// Date parser (MM/DD/YY)
// ----------------------------------------

function parseDate(str) {
    if (!str) return null;
    const [m, d, y] = str.split("/").map(Number);
    return new Date(2000 + y, m - 1, d);
}


// ----------------------------------------
// Colors
// ----------------------------------------

const color = d3
    .scaleOrdinal()
    .domain(["M", "F"])
    .range(["#357EDD","#F768A1"])
    .unknown("#777");


// ----------------------------------------
// Sponsor lanes
// ----------------------------------------

const laneY = {
    "1": 170,
    "2": 290,
    "3": 410,
    "4": 530
};


// ----------------------------------------
// Load data
// ----------------------------------------

const data = (await d3.csv("data.csv"))
    .map((d, i) => {

        const entry = parseDate(d["Child's Date of Entry"]);
        const release = parseDate(d["Child's Date of Release"]);

        return {
            ...d,
            uid: d.ID ?? d.id ?? i,
            entry,
            release,
            gender: d["Child's Gender"],
            category: d["Sponsor Category"] || "4",
            offset:((i * 37) % 100 - 50) * 0.7,
            state: "waiting",
            x: -20,
            y: laneY[d["Sponsor Category"] || "4"]
        };
    })
    .filter(d =>
        d.entry &&
        d.release &&
        laneY[d.category]
    );

const start = d3.min(data, d => d.entry);
const end = d3.max(data, d => d.release);


// ----------------------------------------
// Timeline
// ----------------------------------------

const xScale = d3
    .scaleTime()
    .domain([start, end])
    .range([margin.left, width - margin.right]);


svg.append("g")
    .attr("transform",`translate(0,${height - 35})`)
    .call(d3.axisBottom(xScale));


const marker = svg.append("line")
    .attr("y1", 40)
    .attr("y2", height - 35)
    .attr("stroke", "black")
    .attr("stroke-width", 2);


const dateLabel = svg.append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("font-size", 28)
    .attr("text-anchor", "middle");


// ----------------------------------------
// Bucket
// ----------------------------------------

svg.append("rect")
    .attr("x", bucketLeft)
    .attr("y", 100)
    .attr("width", bucketRight - bucketLeft)
    .attr("height", 500)
    .attr("fill", "#f5f5f5")
    .attr("stroke", "#bbb")
    .attr("rx", 10);


// ----------------------------------------
// Lane labels
// ----------------------------------------

Object.keys(laneY).forEach(category => {

    svg.append("text")
        .attr("x", 60)
        .attr("y", laneY[category] + 5
        )
        .attr("font-size", 16)
        .text(`Category ${category}`
        );
});


// ----------------------------------------
// Simulation
// ----------------------------------------

const particles = [];

function update(currentDate) {

    marker.attr("x1", xScale(currentDate))
        .attr("x2", xScale(currentDate));

    dateLabel.text(
        d3.timeFormat("%m/%d/%Y")(
            currentDate
        )
    );

    // Add entering children
    data.forEach(d => {
        if (d.state === "waiting" &&currentDate >= d.entry) {
            d.state = "active";
            particles.push(d);
        }

        if (d.state === "active" && currentDate >= d.release) {
            d.state = "exiting";
            d.exitTime = currentDate;
        }
    });

    // Remove completed exits
    for (let i = particles.length - 1; i >= 0; i--) {
        const d = particles[i];
        if (d.state === "exiting" && currentDate - d.exitTime > EXIT_DURATION) {
            particles.splice(i, 1);
        }
    }

    // Position particles
    particles.forEach(d => {
        if (d.state === "active") {

            const progress = (currentDate - d.entry) / (d.release - d.entry);
            d.x = bucketLeft + progress * (bucketRight - bucketLeft);

        } else {

            const progress = (currentDate - d.exitTime) / EXIT_DURATION;
            d.x = bucketRight + progress * 120;
        }

        d.y = laneY[d.category] + d.offset;
    });

    // Collision resolution
    const radius = 4;
    for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {

                const a = particles[i];
                const b = particles[j];

                if (a.category !== b.category) continue;

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy ) || 0.01;

                if (dist < radius * 2) {
                    const push = (radius * 2 - dist) / 2;
                    const direction = dy >= 0 ? 1 : -1;
                    a.y -= push * direction;
                    b.y += push * direction;
                }
            }
        }
    }

    // Draw
    svg.selectAll("circle.child")
        .data(particles, d => d.uid)
        .join(
            enter =>
                enter
                    .append("circle")
                    .attr("class","child")
                    .attr("r",3)
                    .attr("fill",d =>color(d.gender))
                    .attr("opacity",0.85),

            update => update,
            exit => exit.remove()
        )
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("opacity",
            d => {
                if (d.state !== "exiting") {
                    return 0.85;
                }
                return Math.max(0,1 - (currentDate - d.exitTime) / EXIT_DURATION);
            }
        );
}

// ----------------------------------------
// Animation clock
// ----------------------------------------

const totalDuration = 30000;
const timer = d3.timer(elapsed => {

    const progress =
        Math.min(elapsed / totalDuration, 1);

    const currentDate = new Date(start.getTime() + progress * (end.getTime() - start.getTime()));
    update(currentDate);

    if (progress >= 1) {
        timer.stop();
    }

});