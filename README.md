# Float Planner

The Float Planner is a tool written to help facilitate the planning of float trips.  I find it invaluable for safety to have a plan of distance to be covered each day along with satellite views and real time river flow data.  The Float Planner aims to centralize this important information.  This tool uses GeoJson data imported from the [USGS NLDI API](https://waterdata.usgs.gov/blog/nldi-intro/) to plot the streambed and streamside [NWIS](https://waterdata.usgs.gov/nwis) water monitoring sites on the map.  A user can select different points along the plotted line and the Float Planner will calculate the distance of each line segment as well as the total distance with the use of the Haversine formula which accounts for the curvature of the Earth.  Users are also presented with multiple map view options, overlays, and links to view realtime information of specific water monitoring sites along the river.

## Installation

Clone the repository then open index.html using the Live Server extension in Visual Studio Code.

## Usage

#### Initial User View

![image](https://user-images.githubusercontent.com/66268023/117162533-7715b180-ad88-11eb-9d61-a20509fb491e.png)

#### A variety of different map views are available to select and different overlays can be shown or hidden:

![image](https://user-images.githubusercontent.com/66268023/117162815-bba14d00-ad88-11eb-8ce3-141800d6424e.png)

#### Topographical View:

![image](https://user-images.githubusercontent.com/66268023/117164323-22733600-ad8a-11eb-8c8e-2e359706d4c7.png)


#### Satellite View:

![image](https://user-images.githubusercontent.com/66268023/117164132-f5bf1e80-ad89-11eb-9f5e-db53221d0a89.png)

#### Satellite+Topographical View:

![image](https://user-images.githubusercontent.com/66268023/117164003-d2946f00-ad89-11eb-9223-6821af736783.png)

#### Example of measuring river distance:


![image](https://user-images.githubusercontent.com/66268023/117166291-d923e600-ad8b-11eb-84bf-bde451bd13a0.png)

#### River Monitoring Station :
###### (links to USGS realtime monitoring information for selected site and displays coordinates)

![image](https://user-images.githubusercontent.com/66268023/117167765-294f7800-ad8d-11eb-8098-9fd25b89faf9.png)

#### Mouseover markers to display coordinates:

![image](https://user-images.githubusercontent.com/66268023/117168614-ef32a600-ad8d-11eb-8ee4-fc666a836c1c.png)

#### Select a popular float to automatically display it on the map:

![image](https://user-images.githubusercontent.com/66268023/117169148-7849dd00-ad8e-11eb-9ac3-36761a061e10.png)







## Next Steps
This tool is still under development. Some next steps that I aim to accomplish are:

- [ ] create a backend to be allow users to select different rivers
- [x] implement interpolation to be able to estimate distance between available USGS data points
- [ ] display line segment color in legend when user is measuring distances
- [ ] create a user friendly page around the map
- [ ] deploy 


