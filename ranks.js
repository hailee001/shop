const RANK_CONFIG = [
    { name: "Đồng", min: 0, class: "rank-dong", icon: "fa-medal" },
    { name: "Bạc", min: 100000, class: "rank-bac", icon: "fa-award" },
    { name: "Vàng", min: 500000, class: "rank-vang", icon: "fa-crown" },
    { name: "Kim Cương", min: 2000000, class: "rank-kimcuong", icon: "fa-gem" },
    { name: "Tinh Anh", min: 5000000, class: "rank-tinhanh", icon: "fa-dragon" }
];

function getRank(totalNap) {
    return [...RANK_CONFIG].reverse().find(r => totalNap >= r.min) || RANK_CONFIG[0];
}

function getTopUsers() {
    let users = [];
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith("user_")) {
            let data = JSON.parse(localStorage.getItem(key));
            users.push({ name: key.replace("user_", ""), total: data.totalNap || 0 });
        }
    }
    return users.sort((a, b) => b.total - a.total).slice(0, 5);
}