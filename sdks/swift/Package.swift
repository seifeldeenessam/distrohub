// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "DistroHubKit",
    platforms: [.macOS(.v12)],
    products: [
        .library(name: "DistroHubKit", targets: ["DistroHubKit"]),
    ],
    targets: [
        .target(name: "DistroHubKit"),
    ]
)
