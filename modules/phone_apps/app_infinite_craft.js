/**
 * Module: App Infinite Craft - 9
 * ID: 3ad72e0d-22a7-4301-8d0b-db5b1f41aa0f
 * Converted for SillyTavern Native Extension
 */

// ==================== VÔ CỰC GIỚI (INFINITE CRAFT MINI) ====================
// Thể loại: Sáng tạo, Giải đố, Kéo thả
// Bản vá: Lưu dữ liệu toàn cục (Dùng chung 1 túi đồ cho mọi Chat), Sửa lỗi Header đè Status Bar, Lỗi tự va chạm & Lỗi trôi dạt thẻ bài khi thả

(function () {
    'use strict';

    const APP_ID = 'infinite_craft';
    const APP_NAME = 'Vô Cực Giới';
    const APP_ICON = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PHJhZGlhbEdyYWRpZW50IGlkPSJTVkdUZFhtc2MzTiIgY3g9IjkzLjM4IiBjeT0iMTU1LjgyNSIgcj0iMTQ4LjY5NiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iLjMzNCIgc3RvcC1jb2xvcj0iIzMwNDlCNCIvPjxzdG9wIG9mZnNldD0iLjUyNSIgc3RvcC1jb2xvcj0iIzJENDZBRiIvPjxzdG9wIG9mZnNldD0iLjczNyIgc3RvcC1jb2xvcj0iIzI2M0VBMiIvPjxzdG9wIG9mZnNldD0iLjk1OCIgc3RvcC1jb2xvcj0iIzFBMzA4QyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzE3MkQ4NyIvPjwvcmFkaWFsR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNTVkdUZFhtc2MzTikiIGQ9Ik0xMTYuNjIgMTI0LjI2SDExLjMyYy00LjE1IDAtNy41Mi0zLjM3LTcuNTItNy41MlYxMS40NGMwLTQuMTUgMy4zNy03LjUyIDcuNTItNy41MmgxMDUuM2M0LjE1IDAgNy41MiAzLjM3IDcuNTIgNy41MnYxMDUuM2MuMDEgNC4xNS0zLjM2IDcuNTItNy41MiA3LjUyIi8+PHBhdGggZmlsbD0iIzMwMzAzMCIgZD0iTTMuOCAxMDcuNzh2OC45NmMwIDQuMTUgMy4zNyA3LjUyIDcuNTIgNy41MmgxMDUuM2M0LjE1IDAgNy41Mi0zLjM3IDcuNTItNy41MlY5Ny44OHMtOC41NC01LjQ1LTEzLjU4LTguMTdzLTExLjQ5LTQuNDYtMTMuOTgtNC4yOXMtMTAuNTIgNC45LTE1LjA0IDguNjRzLTEzLjA0IDExLjcyLTEzLjA0IDExLjcycy04LjI0LTIuOTQtMTEuOTktM2MtNS40MS0uMDktMTUuNjEgNi4wNS0xNS42MSA2LjA1cy0xNS41LTcuOTgtMTkuMzQtOC4yNnMtMTcuNzYgNy4yMS0xNy43NiA3LjIxIi8+PHJhZGlhbEdyYWRpZW50IGlkPSJTVkdJVkpyaGNSdyIgY3g9IjIuOTI3IiBjeT0iLTMyLjA0NCIgcj0iMTM3Ljg0MiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iLjc1NiIgc3RvcC1jb2xvcj0iIzkwNzlGMSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzYzNjZENiIvPjwvcmFkaWFsR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNTVkdJVkpyaGNSdykiIGQ9Ik0zLjgxIDEwNS45OXM1LjE2LTIuNTcgOC4yMi00LjY1czcuOTYtNS43NSA4Ljk0LTZjLjk4LS4yNCAxMS44Ny0uMzcgMjEuNDItLjk4czE0LjkzLS45OCAxNi43Ny0xLjU5czEzLjQ3LTkuMyAxNC4yLTkuOTJzMy43OS00LjQxIDYtNi40OWMyLjItMi4wOCA2LjEyLTYuMzcgOC40NS04Ljk0czE0LjA4LTIyLjc3IDE2LjA0LTI0LjM2czIwLjMxLTcuNCAyMC4zMS03LjRWMTYuMjFzLTEyLjIzIDktMTMuMDkgOXMtMTEuNjMtMi4yLTE1Ljc5LTEuODRjLTQuMTYuMzctNi4yNC43My02LjI0Ljczcy0xMS41MSA3Ljk2LTEyLjM2IDkuMThzLTEyLjE0IDI1LjgzLTEyLjE0IDI1LjgzbC0yMy4wMSAzLjU1cy0xMC41My0uNDktMTIuNDkuNDlzLTkuNTUgNi45OC0xMC42NSA4LjQ1cy02LjM3IDkuNjctNy4xIDExLjAycy0yLjQ1IDQuOS0yLjQ1IDQuOUwzLjggOTIuNTl2MTMuNHoiLz48cmFkaWFsR3JhZGllbnQgaWQ9IlNWR1loYXBSZE52IiBjeD0iOTAuOTExIiBjeT0iMS4yMzUiIHI9IjUyLjgwNiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iLjM4OCIgc3RvcC1jb2xvcj0iIzZENjZENyIvPjxzdG9wIG9mZnNldD0iLjkzNiIgc3RvcC1jb2xvcj0iIzZENjZENyIgc3RvcC1vcGFjaXR5PSIwIi8+PC9yYWRpYWxHcmFkaWVudD48cGF0aCBmaWxsPSJ1cmwoI1NWR1loYXBSZE52KSIgZD0iTTMuODEgMTA1Ljk5czUuMTYtMi41NyA4LjIyLTQuNjVzNy45Ni01Ljc1IDguOTQtNmMuOTgtLjI0IDExLjg3LS4zNyAyMS40Mi0uOThzMTQuOTMtLjk4IDE2Ljc3LTEuNTlzMTMuNDctOS4zIDE0LjItOS45MnMzLjc5LTQuNDEgNi02LjQ5YzIuMi0yLjA4IDYuMTItNi4zNyA4LjQ1LTguOTRzMTQuMDgtMjIuNzcgMTYuMDQtMjQuMzZzMjAuMzEtNy40IDIwLjMxLTcuNFYxNi4yMXMtMTIuMjMgOS0xMy4wOSA5cy0xMi4wOC0xLjgyLTE1Ljc5LTEuODRzLTQuNzIuMi02LjI0LjczYy0xLjUyLjU0LTExLjUxIDcuOTYtMTIuMzYgOS4xOFM2NC41NCA1OS4xMSA2NC41NCA1OS4xMWwtMjMuMDEgMy41NXMtMTAuNTMtLjQ5LTEyLjQ5LjQ5cy05LjU1IDYuOTgtMTAuNjUgOC40NXMtNi4zNyA5LjY3LTcuMSAxMS4wMnMtMi40NSA0LjktMi40NSA0LjlMMy44IDkyLjU5djEzLjR6Ii8+PHJhZGlhbEdyYWRpZW50IGlkPSJTVkdmY2F3OGNaVyIgY3g9IjEzMi42MTciIGN5PSIyOC40NDIiIHI9IjI5LjQ2MiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzI3M0U5QiIvPjxzdG9wIG9mZnNldD0iLjg2MSIgc3RvcC1jb2xvcj0iIzI3M0U5QiIgc3RvcC1vcGFjaXR5PSIwIi8+PC9yYWRpYWxHcmFkaWVudD48cGF0aCBmaWxsPSJ1cmwoI1NWR2ZjYXc4Y1pXKSIgZD0iTTEwMy44NCA0My4wN2MxLjk2LTEuNTkgMjAuMzEtNy40IDIwLjMxLTcuNFYxNi4yMXMtMTIuMjMgOS0xMy4wOSA5YzAgMC04Ljg0IDAtOS42MiA3LjM1czIuNCAxMC41MSAyLjQgMTAuNTEiLz48cmFkaWFsR3JhZGllbnQgaWQ9IlNWR3lVdFFyYk54IiBjeD0iLTIuNjYyIiBjeT0iMTE2LjUyMiIgcj0iMzAuNDE3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIuMiIgc3RvcC1jb2xvcj0iIzI3M0U5QiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzI3M0U5QiIgc3RvcC1vcGFjaXR5PSIwIi8+PC9yYWRpYWxHcmFkaWVudD48cGF0aCBmaWxsPSJ1cmwoI1NWR3lVdFFyYk54KSIgZD0ibTguODUgODcuNTFsLTUuMDQgNS4wN3YxMy40MXM1LjE2LTIuNTcgOC4yMi00LjY1czcuOTYtNS43NSA4Ljk0LTZsOS4zMy0uNTRzLTQuMzUtMTAuMjQtNy43My0xMS44NmMtOS40Mi00LjUxLTEzLjcyIDQuNTctMTMuNzIgNC41NyIvPjxwYXRoIGZpbGw9IiMwQTY3QTgiIGQ9Ik0xMTYuNSAzMS4xNGMuNDggMS4xOCA3LjY0LjA2IDcuNjQuMDZ2LTkuNzVzLTIuNDEgMS42MS00LjQ3IDMuOTFjLTEuOTUgMi4xNy0zLjg4IDQuMDQtMy4xNyA1Ljc4Ii8+PHJhZGlhbEdyYWRpZW50IGlkPSJTVkdqcXplVmIyaCIgY3g9Ijc5LjUxMiIgY3k9IjMwLjc5OCIgcj0iMjguMzM1IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KC41NDgyIC44MzY0IC0xLjQ0NzQgLjk0ODYgODAuNTAzIC02NC45MikiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9Ii4yMDgiIHN0b3AtY29sb3I9IiM2RDY2RDciLz48c3RvcCBvZmZzZXQ9Ii4zNSIgc3RvcC1jb2xvcj0iIzYwNjZEMSIvPjxzdG9wIG9mZnNldD0iLjYxNiIgc3RvcC1jb2xvcj0iIzNENjZDMCIvPjxzdG9wIG9mZnNldD0iLjk0MyIgc3RvcC1jb2xvcj0iIzBBNjdBOCIvPjwvcmFkaWFsR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNTVkdqcXplVmIyaCkiIGQ9Ik0xMTAuNCAzMy4yOGMuMjQuNjctNi45IDMuOTYtOS4xMSA0LjkxYy0yLjIyLjk1LTMuOTYgMS43NC00Ljc2IDIuNTRjLS43OS43OS0yLjIyIDMuNTctMy4yNSA3LjIxcy0xLjUxIDYuNS0yLjMgNy4zN3MtNC42OCAxLjk4LTUuMzEgMi4zOHMtNC4xMiA2LjE4LTUuNDcgOC4wOHMtNy40NSA2LjgyLTkuNzUgOC40cy0xMC4yMiA3LjI5LTExLjk3IDQuOTljLTEuNzQtMi4zIDIuNzctOC44IDMuNDEtOS41OWMuNjMtLjc5IDQuNi0zLjA5IDQuNi0zLjA5czIuNDYtMTIuODQgMy4zMy0xNC4zNXMzLjU3LTEuOTggNC45MS0yLjU0YzEuMzUtLjU1IDIuMzgtLjc5IDIuMzgtLjc5czIuNzctMi42MiA0LjEyLTMuNDFzMy41Ny0uNjMgMy41Ny0uNjNzMi4wNi0xMC4zIDMuMjUtMTEuODlzNy42MS0xLjkgMTAuMzgtMi42MmMyLjc4LS42OSAxMC40Ni0xLjI1IDExLjk3IDMuMDMiLz48cmFkaWFsR3JhZGllbnQgaWQ9IlNWR0pibHRTYlJoIiBjeD0iMTcuMzQxIiBjeT0iNTMuOTI5IiByPSIzOS4wOTkiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoLjU4NTcgLjgxMDUgLTEuMDg4MSAuNzg2MyA2NS44NjUgLTIuNTMpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIuNDYxIiBzdG9wLWNvbG9yPSIjOTA3OUYxIi8+PHN0b3Agb2Zmc2V0PSIuNTE3IiBzdG9wLWNvbG9yPSIjOEE3OEVFIi8+PHN0b3Agb2Zmc2V0PSIuNTkiIHN0b3AtY29sb3I9IiM3QTc2RTUiLz48c3RvcCBvZmZzZXQ9Ii42NyIgc3RvcC1jb2xvcj0iIzYwNzNENyIvPjxzdG9wIG9mZnNldD0iLjc1OCIgc3RvcC1jb2xvcj0iIzNCNkVDMyIvPjxzdG9wIG9mZnNldD0iLjg0OSIgc3RvcC1jb2xvcj0iIzBENjdBQSIvPjxzdG9wIG9mZnNldD0iLjg1NCIgc3RvcC1jb2xvcj0iIzBBNjdBOCIvPjwvcmFkaWFsR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNTVkdKYmx0U2JSaCkiIGQ9Ik0xMy4zOSA5MS4zOGMuOTguODggMi4zOC0uMjQgOC44LTEuMzVzMTcuMzYtLjcxIDE4LjYyLTEuMTljMS4yNy0uNDggOS45MS0yLjM4IDExLjMzLTMuOTZjMS40My0xLjU5IDEuMjctMTEuNTcgMS43NC0xNC43NGMuNDgtMy4xNyAxLjktMTIuMTMgMS41OS0xMy44N2MtLjMyLTEuNzQtMi40Ni0xLjI3LTMuMDkuNGMtLjYzIDEuNjYtMy44IDkuODMtNi4xOCAxMC44NnMtMy44OCAxLjE5LTQuNTIgMS43NGMtLjYzLjU1LTYuNDIgNi43NC03LjA1IDYuODJzLTYuNTgtMS41OS03Ljg1LS45NWMtMS4yNy42My01Ljg2IDQuNi02LjkgNS43OWMtMS4wMiAxLjE3LTcuOTkgOS4xLTYuNDkgMTAuNDUiLz48cmFkaWFsR3JhZGllbnQgaWQ9IlNWR1J1S0d1Y0lUIiBjeD0iNjIuMTkzIiBjeT0iOTcuOTEyIiByPSI1NS4xMjQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9Ii4zNTEiIHN0b3AtY29sb3I9IiNEMEI0RjQiIHN0b3Atb3BhY2l0eT0iLjA0OSIvPjxzdG9wIG9mZnNldD0iLjY3OSIgc3RvcC1jb2xvcj0iI0QwQjRGNCIvPjwvcmFkaWFsR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNTVkdSdUtHdWNJVCkiIGQ9Ik0zNi40NSA3MC4yMnMxLjg1LTE0LjE3IDEwLjQ0LTIyLjk0YzQuOC00LjkgMjYuMS0uNzggMjcuMDgtLjI5czkuMTggMjUuNTggOS4xOCAyNS41OHMtOS4zIDkuOTItOS43OSAxMC4yOGMtLjQ5LjM3LTEzLjIyIDkuNzktMTQuMiA5LjkyYy0uOTguMTItMjIuNzEtMjIuNTUtMjIuNzEtMjIuNTUiLz48cmFkaWFsR3JhZGllbnQgaWQ9IlNWRzJPazFRZHJtIiBjeD0iNzIuNjg5IiBjeT0iNjcuMTQyIiByPSIxOS40MzciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9Ii4xODkiIHN0b3AtY29sb3I9IiMwQTY3QTgiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwQTY3QTgiIHN0b3Atb3BhY2l0eT0iLjAyIi8+PC9yYWRpYWxHcmFkaWVudD48cGF0aCBmaWxsPSJ1cmwoI1NWRzJPazFRZHJtKSIgZD0iTTkzLjI4IDQ3Ljk1Yy0xLjAzIDMuNjUtMS41MSA2LjUtMi4zIDcuMzdzLTQuNjggMS45OC01LjMxIDIuMzhzLTQuMTIgNi4xOC01LjQ3IDguMDhzLTcuNDUgNi44Mi05Ljc1IDguNHMtMTAuMjIgNy4yOS0xMS45NyA0Ljk5Yy0xLjc0LTIuMyAyLjc3LTguOCAzLjQxLTkuNTljLjYzLS43OSA0LjYtMy4wOSA0LjYtMy4wOXMyLjQ2LTEyLjg0IDMuMzMtMTQuMzVzMy41Ny0xLjk4IDQuOTEtMi41NGMxLjM1LS41NSAyLjM4LS43OSAyLjM4LS43OXMyLjc3LTIuNjIgNC4xMi0zLjQxczMuNTctLjYzIDMuNTctLjYzczkuNTEtLjQ3IDguNDggMy4xOCIvPjxyYWRpYWxHcmFkaWVudCBpZD0iU1ZHczVzVGxiWk8iIGN4PSI1Ni4wMDgiIGN5PSI1MS44MDkiIHI9IjE3LjM4MyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iLjAxMSIgc3RvcC1jb2xvcj0iIzBBNjdBOCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBBNjdBOCIgc3RvcC1vcGFjaXR5PSIuMDIiLz48L3JhZGlhbEdyYWRpZW50PjxwYXRoIGZpbGw9InVybCgjU1ZHczVzVGxiWk8pIiBkPSJNNDAuODEgODguODRjMS4yNy0uNDggOS45MS0yLjM4IDExLjMzLTMuOTZjMS40My0xLjU5IDEuMjctMTEuNTcgMS43NC0xNC43NGMuNDgtMy4xNyAxLjktMTIuMTMgMS41OS0xMy44N2MtLjMyLTEuNzQtMi40Ni0xLjI3LTMuMDkuNGMtLjYzIDEuNjYtMy44IDkuODMtNi4xOCAxMC44NnMtMy44OCAxLjE5LTQuNTIgMS43NGMtLjYzLjU1LTYuNDIgNi43NC03LjA1IDYuODJzLTYuNTgtMS41OS03Ljg1LS45NWMtMS4yNi42MiAxMi43NyAxNC4xOCAxNC4wMyAxMy43Ii8+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTU1LjE5IDUwLjIyYy0uMzcuNjgtLjMxIDEuNjYuNDMgMi4yMmMuNzkuNiAxLjg4LjM1IDIuMzEtLjMzYy40MS0uNjUuNDYtMS43LS41My0yLjM4Yy0uODItLjU2LTEuODQtLjE5LTIuMjEuNDltNy42NCAyLjg1Yy0uMy41NS0uMTQgMS4xNS40NSAxLjQ1Yy41OS4yOSAxLjE1LS4wNCAxLjM0LS40MmMuMjMtLjQ2LS4wNC0xLjI2LS41My0xLjQyYy0uMzctLjEyLS45OS0uMS0xLjI2LjM5bS4xNCA0LjM1Yy0uNjEtLjA0LTEuMi40MS0xLjI0IDEuMTZzLjMyIDEuMzQgMS4xNCAxLjM0Yy44NSAwIDEuMTgtLjU1IDEuMjQtMS4wNGMuMDYtLjQ4LS4xOS0xLjQtMS4xNC0xLjQ2bTEwLjQ5IDQuMDFjLS4yNS44OS4yOCAxLjkzIDEuNDcgMS45OWMxLjIuMDYgMS43Mi0uNzEgMS43Mi0xLjc1YzAtLjgzLS42Ny0xLjUtMS42OS0xLjQ3Yy0uODMuMDMtMS4zMi41OC0xLjUgMS4yM20xLjM0LTE1LjE3Yy42LjUxLjQ0IDEuMjguMDUgMS42NXMtMS4xLjQxLTEuNDguMDVjLS41MS0uNDktLjQ2LTEuMjEtLjEyLTEuNThjLjQzLS40NyAxLjA5LS41MSAxLjU1LS4xMm0tMy40IDMxLjczYy0uNTIuNjgtLjM0IDEuNjUuNCAyLjA4Yy42My4zNyAxLjQ2LjM2IDEuOTUtLjRzLjExLTEuNzYtLjQtMi4wN2MtLjUxLS4yOS0xLjQyLS4zMS0xLjk1LjM5bS0xMS43IDNjLS4wMi40OS4yMy44OS43Ny45MXMuNzctLjMzLjgtLjc3YS43OTMuNzkzIDAgMCAwLS44LS44NGMtLjQyIDAtLjc1LjM4LS43Ny43bS00LjkxLTYuMzdjLS4wNi43OS40IDEuMzkgMS4xOSAxLjM2Yy43OS0uMDIgMS4yOS0uMjcgMS4zMS0xLjE5cy0uNjctMS4yNC0xLjI0LTEuMjZjLS41Ny0uMDMtMS4yMS4zOS0xLjI2IDEuMDltMi4xNy0zMi40NmMtLjA4Ljg3LjY3IDEuMjkgMS4yMyAxLjMyYy42Ny4wMyAxLjI2LS4yOCAxLjI5LTEuMjFjLjAzLTEuMDEtLjYyLTEuMzItMS4yMy0xLjMyYy0uNDguMDEtMS4yMS4zMS0xLjI5IDEuMjEiLz48cGF0aCBmaWxsPSIjRkZENzE3IiBkPSJNNjIuMzQgNDQuNjVzLTEuMzgtNC4xMS0uODUtNC40OWMuNS0uMzYgNC4xNSAxLjgxIDQuMTUgMS44MXMyLjk1LTIuMSAzLjUzLTEuNjljLjU0LjM4LS41IDMuODQtLjUgMy44NHMyLjc1IDIuMDUgMi42OSAyLjU3Yy0uMDguNjEtMy41NyAxLjM0LTMuNTcgMS4zNHMtMS4wNCAzLjU3LTEuNzMgMy42NGMtLjUuMDYtMi4yNi0zLjM0LTIuMjYtMy4zNHMtNC4wMS41Mi00LjE3LjAyYy0uMjctLjg0IDIuNzEtMy43IDIuNzEtMy43Ii8+PHBhdGggZmlsbD0iI0ZFRTI2MiIgZD0iTTcwLjcxIDY3LjY2cy42NC0yLjkxIDEuMTYtMy4wM3MyLjA3IDIuNDcgMi4wNyAyLjQ3czMuNDctLjQ0IDMuNzUuMTZjLjI0LjUyLTEuOTUgMi45MS0xLjk1IDIuOTFzMS4zNiAzLjM5Ljk2IDMuODNjLS4zNC4zOC0zLjM0LS45Mi0zLjM0LS45MnMtMy4wOSAyLjE5LTMuMjMgMS45MmMtLjI2LS40OS4yOS0zLjYzLjI5LTMuNjNzLTMuMTQtMS42OC0yLjk4LTIuMjRjLjE1LS41NiAzLjI3LTEuNDcgMy4yNy0xLjQ3Ii8+PHBhdGggZmlsbD0iI0ZGRjdCMyIgZD0iTTgwLjc0IDUyLjFzLTMuMTQgMS4zNy0zLjE4IDIuMDZzMy44NCAxLjQ3IDMuODQgMS40N3MuNDggMy42IDEuMjUgMy43MnMyLjIyLTMuMjQgMi4yMi0zLjI0czMuNjkuMjQgMy44OS0uMzdjLjE4LS41Ny0yLjQ1LTIuOTUtMi40NS0yLjk1czEuNi0zLjE5IDEuMTEtMy42NWMtLjUtLjQ2LTMuNTkgMS40Ny0zLjU5IDEuNDdzLTIuNTUtMi43OC0zLjIxLTIuNDNjLS41Mi4yNi4xMiAzLjkyLjEyIDMuOTJtLTQwLjQyLjI5cy0yLjQ1LTMuMTMtMi44Ny0yLjk4cy0uNTQgNC4wMS0uNTQgNC4wMXMtMy42NyAxLjE4LTMuNjcgMS42MWMwIC41NyAzLjE3IDEuODcgMy4xNyAxLjg3cy4xMSAzLjg2LjY1IDQuMDljLjUxLjIyIDIuODMtMi42IDIuODMtMi42czQuMDEuOCA0LjMyLjVjLjMxLS4zMS0xLjQ1LTMuOS0xLjQ1LTMuOXMxLjgtMy4xMyAxLjQ1LTMuNjNjLS4zNC0uNS0zLjg5IDEuMDMtMy44OSAxLjAzTTU1LjEgODYuNnMuMDMtNC44NS43My01LjE4czMuMTggNC4wMSAzLjE4IDQuMDFzNC43LTEuNzMgNS4wMy0xLjIzcy0yLjQzIDQuNzktMi40MyA0Ljc5czMuMTQgNC4yOSAyLjY0IDQuNzRjLS41LjQ2LTUuMjMtLjk4LTUuMjMtLjk4cy0zLjA2IDMuOTktMy44MSAzLjUxYy0uNzktLjUtLjMxLTUuMjQtLjMxLTUuMjRzLTQuOTktMS40NC00Ljg3LTIuMTRzNS4wNy0yLjI4IDUuMDctMi4yOCIvPjxwYXRoIGZpbGw9IiNGRkM2QjIiIGQ9Ik00NC40MiAzNC4wN3MtMS45Mi00LjQtMS40NC01LjA1czQuOTggMi4xNCA0Ljk4IDIuMTRzMy4yMy0zLjQ3IDMuOTUtMy4wNmMuNzkuNDYtLjI5IDUuMDMtLjI5IDUuMDNzNC4xOSAyLjY5IDQuMTEgMy40NmMtLjA3Ljc3LTQuOTYgMS43MS00Ljk2IDEuNzFzLTEuNDIgNC45Ni0yIDUuMDNjLS42LjA4LTMuMDYtNC42OS0zLjA2LTQuNjlzLTQuNzYuMTItNS0uNTVzMy43MS00LjAyIDMuNzEtNC4wMm0tNi4wNyA0NC4zNWMtLjA1IDIuMDggMS4xNCAzLjg1IDMuNTcgMy45MmMyLjY4LjA4IDMuNjItMi4wOCAzLjYtMy45Yy0uMDItMS44MS0xLjQ2LTMuNTUtMy42LTMuNDJzLTMuNTMgMS41My0zLjU3IDMuNE04Ni43NCA0MGMtMS4yMy4wMi0yLjMxLjczLTIuMjUgMi40N2MuMDUgMS41NiAxLjM2IDIuMTMgMi4zOSAyLjFjMS4wNS0uMDQgMi4wNi0uNTkgMi4xMS0yLjExYy4wNi0xLjQ3LS44OC0yLjQ4LTIuMjUtMi40NiIvPjxwYXRoIGZpbGw9IiNGRkY3QjMiIGQ9Ik0xMDUuMzEgMjcuNjhjLTEuODctLjEyLTIuODQgMS4zMi0yLjg4IDMuMDZjLS4wMyAxLjc0IDEuMDcgMy4wNSAzLjAzIDMuMDNjMS45Mi0uMDIgMi43LTEuNzEgMi42NS0zLjA2Yy0uMDctMi4wNS0xLjI0LTIuOTItMi44LTMuMDMiLz48cGF0aCBmaWxsPSIjRkVFMjYyIiBkPSJNMTEuNjIgNjIuNzdzLTMuNzQtMi41OC00LjEyLTIuMjJjLS40LjM3LjI5IDQuNzUuMjkgNC43NXMtMy4wOSAyLjk2LTIuOTMgMy40N2MuMTMuNDIgMy45NS43IDMuOTUuN3MxLjc4IDMuODIgMi40NSAzLjg5Yy42Ny4wNiAyLjE3LTMuNjYgMi4xNy0zLjY2czQuMjQuMjIgNC40Ni0uMzhjLjIyLS42MS0yLjUxLTMuNjctMi41MS0zLjY3czEuMDgtNC40LjU0LTQuNzJzLTQuMyAxLjg0LTQuMyAxLjg0bTE0LjYxLTQuMjNjLS4wNi44Ni43NiAxLjU2IDEuNjYgMS40M2MuODktLjEzIDEuMTUtLjczIDEuMTgtMS41NnMtLjgzLTEuNDMtMS41LTEuMzRjLS42Ny4xLTEuMjcuNTUtMS4zNCAxLjQ3bTc2LjUxLjE5Yy0uOTMtLjAxLTEuNzQuNzItMS42NiAxLjgzYy4wOCAxLjA2Ljg5IDEuNTggMS45MSAxLjU0czEuNi0uOTEgMS42LTEuNjRzLS40OC0xLjcxLTEuODUtMS43M20yLjc1LTcuMzljLS4wNi42NC40NiAxLjA3IDEuMTQgMS4wOWMuODEuMDIgMS4xNC0uNDcgMS4xMS0xLjE0Yy0uMDQtLjY4LS41Ni0uOTctMS4wOS0xLjAzcy0xLjA4LjI5LTEuMTYgMS4wOG0xNS4yOC0yLjA3YzAgLjQ4LjMzIDEuMDcgMS4xMSAxLjA1Yy43OS0uMDEgMS4wNS0uNTEgMS4xLTEuMDJzLS4yOS0xLjExLTEuMTQtMS4xM3MtMS4wNy42Mi0xLjA3IDEuMW0tMTYuNC0zMi40M2MtLjkuMDEtMS45OC41OS0yIDIuMTJzMS4yIDIuMTggMi4yIDIuMTZzMi4xMi0uNjcgMi4xMi0yLjE0Yy0uMDEtMS40LTEuMDMtMi4xNi0yLjMyLTIuMTRtLTkuMTMtNi42N2MtLjg4LjAzLTEuNDkuNzEtMS40OSAxLjUzcy42MSAxLjQ4IDEuNTYgMS40NGMxLjAyLS4wNCAxLjM5LS44IDEuNDItMS40NGMuMDQtLjc3LS41OS0xLjU2LTEuNDktMS41MyIvPjxwYXRoIGZpbGw9IiNGRkY3QjMiIGQ9Im0zNi40MyA4NS44MmwtMi4yIDIuNTRsMi4yNCAyLjgzbDIuNjItMi43NHptOS42IDEyLjdjLjQ3LjUzLjQxIDEuNDUtLjI2IDEuOTJjLS40Ni4zMi0xLjE5LjI5LTEuNjYtLjIxYy0uNDMtLjQ1LS40Ny0xLjE5LjAyLTEuNzNjLjUtLjUzIDEuMzktLjU2IDEuOS4wMm0zLjA0LTEuNjFjLS40Mi40LS4zNC45OC0uMDggMS4zNWMuMjMuMzMgMS4wMi41MyAxLjQ1LjA2Yy4yMS0uMjQuMzctMS4wMi0uMDItMS4zOWExIDEgMCAwIDAtMS4zNS0uMDJNMjYuNzkgNjcuMTNjLS43Ni0uMDItLjk4LjYyLS45NiAxLjAzcy4zNS44Ny45MS44N3MuOTMtLjUuOTEtMWMtLjAyLS40OS0uMjgtLjg4LS44Ni0uOW0tMTguNzcgOS42Yy0xLjEyLjA4LTEuNDMuNzUtMS40IDEuNjVjLjAzLjg0LjU3IDEuNCAxLjYxIDEuNDNjLjg2LjAzIDEuNDctLjY0IDEuNDctMS42MWMuMDEtLjk3LS42Ny0xLjU0LTEuNjgtMS40N20xOS41MS0zOC41OGMtLjgtLjAyLTEuMjQuNjItMS4yOCAxLjIxYy0uMDUuNzUuNTUgMS4xOSAxLjIxIDEuMjFjLjc4LjAyIDEuMDktLjYyIDEuMTItMS4xMnMtLjIxLTEuMjctMS4wNS0xLjNtMjcuMy0yMi4wNmMwIC42Ni4zNiAxLjA0Ljk4IDEuMDZjLjU0LjAyLjk2LS40NC45Ni0xcy0uNDItLjk4LS45Ni0uOThzLS45OC4zNC0uOTguOTIiLz48cGF0aCBmaWxsPSIjRkVFMDY2IiBkPSJNNDUuNDcgMjEuMTFjLS42MS0uMDQtMS4xLjM5LTEuMTIgMS4wNXMuMzcgMS4wNSAxLjA1IDEuMDVzMS4wOC0uMzIgMS4xLS44OGMuMDItLjcxLS4zNS0xLjE3LTEuMDMtMS4yMk00OCAxNS4zOGMtLjczIDAtMS4wNi40MS0xLjExIDEuMDRzLjQ2IDEuMTUgMS4wMSAxLjE3Yy42Ny4wMyAxLjE5LS40MSAxLjE0LTEuMTdjLS4wNS0uNjctLjQ3LTEuMDQtMS4wNC0xLjA0Ii8+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTE3Ljg1IDc0LjYxYy0uMi43MS4yMiAxLjU0IDEuMTcgMS41OXMxLjM3LS41NiAxLjM3LTEuMzljMC0uNjYtLjU0LTEuMi0xLjM0LTEuMTdjLS42Ni4wMi0xLjA1LjQ2LTEuMi45N20xMi4zMiA5LjgyYy0uMTkuNjUuMiAxLjQyIDEuMDggMS40NnMxLjI2LS41MiAxLjI2LTEuMjhjMC0uNjEtLjQ5LTEuMS0xLjI0LTEuMDhjLS42MS4wMi0uOTcuNDMtMS4xLjltMTEuNTMgNi45Yy0uMTUuNTEuMTYgMS4xMS44NCAxLjE0cy45OC0uNC45OC0xYzAtLjQ3LS4zOS0uODYtLjk3LS44NGMtLjQ3LjAxLS43NS4zMy0uODUuN20tMzMuMzkgMy41Yy0uMTkuNjYuMiAxLjQzIDEuMDkgMS40N2MuODguMDUgMS4yNy0uNTIgMS4yNy0xLjI5YzAtLjYxLS41LTEuMTEtMS4yNS0xLjA5Yy0uNjEuMDItLjk3LjQzLTEuMTEuOTFtNzMuNDgtNjEuOTJjLjQ4LjQxLjM1IDEuMDIuMDQgMS4zMXMtLjg4LjMzLTEuMTguMDRjLS40MS0uMzktLjM3LS45Ni0uMDktMS4yNmMuMzQtLjM3Ljg2LS40MSAxLjIzLS4wOW0xNS40OS03LjI0Yy43Ny42NS41NyAxLjY0LjA2IDIuMTFjLS41MS40OC0xLjQyLjUzLTEuOS4wNmMtLjY1LS42Mi0uNi0xLjU1LS4xNS0yLjAyYy41Ni0uNiAxLjQtLjY2IDEuOTktLjE1bS02LjI1LTguNzljLjY4LjU4LjUgMS40NC4wNSAxLjg2cy0xLjI1LjQ2LTEuNjguMDVjLS41OC0uNTUtLjUyLTEuMzYtLjEzLTEuNzhjLjUtLjUzIDEuMjQtLjU4IDEuNzYtLjEzbTI2LjI3LjQzYy42LjUxLjQ0IDEuMjguMDUgMS42NWMtLjQuMzctMS4xMS40MS0xLjQ5LjA1Yy0uNTEtLjQ5LS40Ny0xLjIxLS4xMi0xLjU4Yy40NC0uNDcgMS4xLS41MSAxLjU2LS4xMm0zLjctMy4yOWMuMzkuMzMuMjkuODMuMDMgMS4wOGMtLjI2LjI0LS43Mi4yNy0uOTcuMDNjLS4zMy0uMzItLjMtLjc5LS4wOC0xLjAzYy4yOS0uMzEuNzItLjM0IDEuMDItLjA4bS04LjA0IDMxLjA0Yy42NC41NS40NyAxLjM3LjA1IDEuNzZzLTEuMTguNDQtMS41OS4wNWMtLjU1LS41Mi0uNS0xLjI5LS4xMi0xLjY5Yy40Ny0uNDkgMS4xNy0uNTQgMS42Ni0uMTJtLTE3LjQ3IDcuMTFjLjQ2LjM5LjM0Ljk3LjA0IDEuMjZjLS4zLjI4LS44NC4zMS0xLjEzLjA0Yy0uMzktLjM3LS4zNS0uOTItLjA5LTEuMmMuMzMtLjM3LjgzLS40IDEuMTgtLjEiLz48L3N2Zz4=" style="width:75%;height:75%">';
    
    // Đã đổi key để tạo ra một file save chung duy nhất cho tất cả các chat
    const STORAGE_KEY = 'phone_infinite_craft_global_save';

    // ==================== KHO NGUYÊN TỐ CƠ BẢN (Dành cho New Game) ====================
    const BASE_ELEMENTS = [
        { name: 'Nước', emoji: '💧' }, { name: 'Lửa', emoji: '🔥' }, { name: 'Đất', emoji: '🌍' }, 
        { name: 'Gió', emoji: '💨' }, { name: 'Ánh sáng', emoji: '✨' }, { name: 'Bóng tối', emoji: '🌑' },
        { name: 'Kim loại', emoji: '⚙️' }, { name: 'Gỗ', emoji: '🪵' }, { name: 'Sét', emoji: '⚡' },
        { name: 'Băng', emoji: '❄️' }, { name: 'Đá', emoji: '🪨' }, { name: 'Hạt giống', emoji: '🌱' },
        { name: 'Linh hồn', emoji: '👻' }, { name: 'Máu', emoji: '🩸' }, { name: 'Thời gian', emoji: '⏳' },
        { name: 'Không gian', emoji: '🌌' }, { name: 'Công nghệ', emoji: '💻' }, { name: 'Ma thuật', emoji: '🪄' },
        { name: 'Hỗn mang', emoji: '🌪️' }, { name: 'Trật tự', emoji: '⚖️' }
    ];

    // ==================== QUẢN LÝ TRẠNG THÁI GAME ====================
    let GameState = {
        inventory: [], 
        workspace: []  
    };

    // Đã xóa hàm getChatId() vì không còn cần thiết phân tách dữ liệu theo chat nữa

    function getStoreKey() {
        return STORAGE_KEY; // Trả về đúng 1 key duy nhất cho toàn bộ hệ thống
    }

    function hasSavedGame() {
        return !!localStorage.getItem(getStoreKey());
    }

    function loadGame() {
        try {
            const saved = localStorage.getItem(getStoreKey());
            if (saved) {
                GameState = JSON.parse(saved);
                return true;
            }
        } catch (e) {}
        return false;
    }

    function saveGame() {
        localStorage.setItem(getStoreKey(), JSON.stringify(GameState));
    }

    function startNewGame() {
        const shuffled = [...BASE_ELEMENTS].sort(() => 0.5 - Math.random());
        const starters = shuffled.slice(0, 4);

        GameState = {
            inventory: starters,
            workspace: []
        };
        saveGame();
    }

    // ==================== CSS CỦA GAME ====================
    const CRAFT_STYLES = `
        .craft-app { display: flex; flex-direction: column; height: 100%; background: #1a1a2e; color: #fff; font-family: 'Segoe UI', sans-serif; overflow: hidden; user-select: none; touch-action: none; padding-top: 44px; box-sizing: border-box;}
        
        .craft-header { background: rgba(15, 15, 25, 0.9); backdrop-filter: blur(10px); padding: 12px 16px; display: flex; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 100; height: 48px; box-sizing: border-box;}
        .craft-back-btn { font-size: 20px; cursor: pointer; opacity: 0.8; transition: opacity 0.2s; padding-right: 15px;}
        .craft-back-btn:active { opacity: 1; }
        .craft-title { flex: 1; font-weight: 600; font-size: 16px; text-align: center; background: -webkit-linear-gradient(45deg, #ff9a9e, #fecfef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .craft-clear-btn { font-size: 18px; cursor: pointer; opacity: 0.8; padding-left: 15px;}
        
        .craft-menu { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: radial-gradient(circle at center, #2a2a4a 0%, #1a1a2e 100%); padding: 20px; text-align: center;}
        .craft-menu-logo { font-size: 70px; margin-bottom: 10px; filter: drop-shadow(0 0 20px rgba(255,255,255,0.3)); animation: floatLogo 3s ease-in-out infinite;}
        .craft-menu-title { font-size: 28px; font-weight: 800; margin-bottom: 40px; letter-spacing: 2px;}
        .craft-menu-btn { width: 80%; padding: 15px; border-radius: 12px; border: none; font-size: 16px; font-weight: bold; cursor: pointer; margin-bottom: 15px; transition: transform 0.1s, filter 0.2s; }
        .craft-menu-btn:active { transform: scale(0.95); }
        .btn-continue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.4);}
        .btn-new { background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%); color: white; box-shadow: 0 4px 15px rgba(255, 8, 68, 0.4);}
        
        @keyframes floatLogo { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

        .craft-game { display: none; flex-direction: column; height: 100%; flex: 1; }
        .craft-game.active { display: flex; }
        
        .craft-workspace { flex: 1; position: relative; background: #11111f; overflow: hidden; }
        
        .craft-inventory-wrap { height: 35%; background: rgba(25, 25, 35, 0.95); border-top: 2px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;}
        .craft-inventory-header { padding: 8px 15px; font-size: 12px; color: #888; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;}
        .craft-inventory { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-wrap: wrap; gap: 10px; align-content: flex-start;}
        
        .craft-item { 
            background: #fff; color: #000; padding: 8px 12px; border-radius: 8px; font-size: 15px; font-weight: 600; 
            display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            border: 1px solid #ddd; cursor: grab; user-select: none; touch-action: none;
            transition: transform 0.1s;
        }
        .craft-item:active { cursor: grabbing; transform: scale(0.95); }
        .craft-item.new-discovery { border: 2px solid #FFD700; box-shadow: 0 0 10px #FFD700; background: #fffdf0; }
        
        .craft-item.dragging { position: absolute; z-index: 1000; box-shadow: 0 10px 20px rgba(0,0,0,0.5); pointer-events: none; opacity: 0.9;}
        
        .craft-loading { position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: none; flex-direction: column; align-items: center; justify-content: center; }
        .craft-loading.show { display: flex; }
        .craft-spinner { font-size: 40px; animation: spin 1s infinite linear; margin-bottom: 10px;}
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .craft-flash { position: absolute; width: 100px; height: 100px; background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: flashAnim 0.5s ease-out forwards; z-index: 500;}
        @keyframes flashAnim { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
    `;

    // ==================== TẠO HTML ====================
    function generateHTML() {
        return `
            <div class="craft-app" id="craft-app-container">
                <div class="craft-header">
                    <div class="craft-back-btn" id="btn-exit-app" title="Thoát">🔙</div>
                    <div class="craft-title">Vô Cực Giới</div>
                    <div class="craft-clear-btn" id="btn-clear-workspace" title="Dọn dẹp bàn" style="display:none;">🧹</div>
                </div>

                <div class="craft-menu" id="craft-view-menu">
                    <div class="craft-menu-logo">✨</div>
                    <div class="craft-menu-title">Vô Cực Giới</div>
                    
                    <button class="craft-menu-btn btn-continue" id="btn-continue-game" style="display: none;">
                        Tiếp Tục Chơi (<span id="menu-item-count">0</span> Đồ)
                    </button>
                    
                    <button class="craft-menu-btn btn-new" id="btn-new-game">
                        Bắt Đầu Mới
                    </button>
                    
                    <div style="font-size:12px; color:#888; margin-top:20px; line-height: 1.5;">
                        Kéo thả 2 nguyên tố vào nhau để kết hợp.<br>Sử dụng AI để khám phá vô hạn!<br>(Chế độ dùng chung túi đồ Toàn Cục)
                    </div>
                </div>

                <div class="craft-game" id="craft-view-game">
                    <div class="craft-workspace" id="craft-workspace">
                        </div>
                    
                    <div class="craft-inventory-wrap">
                        <div class="craft-inventory-header">
                            <span>Kho Đồ</span>
                            <span id="inventory-count">4</span>
                        </div>
                        <div class="craft-inventory" id="craft-inventory">
                            </div>
                    </div>
                </div>

                <div class="craft-loading" id="craft-loading">
                    <div class="craft-spinner">⚙️</div>
                    <div style="font-weight:bold;">Đang kết hợp...</div>
                </div>
            </div>
        `;
    }

    // ==================== LOGIC GAME CỐT LÕI ====================
    let currentIframeDoc = null;
    let isDragging = false;
    let dragEl = null;
    let offsetX = 0, offsetY = 0;
    
    let draggedData = null; 
    let sourceArea = null;  

    function getDoc() { return currentIframeDoc || document; }

    function updateMenuUI() {
        const doc = getDoc();
        if (hasSavedGame()) {
            loadGame();
            doc.getElementById('btn-continue-game').style.display = 'block';
            doc.getElementById('menu-item-count').innerText = GameState.inventory.length;
        } else {
            doc.getElementById('btn-continue-game').style.display = 'none';
        }
    }

    function startGame(isNew) {
        if (isNew) startNewGame();
        else loadGame();

        const doc = getDoc();
        doc.getElementById('craft-view-menu').style.display = 'none';
        doc.getElementById('craft-view-game').classList.add('active');
        doc.getElementById('btn-clear-workspace').style.display = 'block';
        
        renderInventory();
        renderWorkspace();
    }

    function renderInventory() {
        const doc = getDoc();
        const invContainer = doc.getElementById('craft-inventory');
        doc.getElementById('inventory-count').innerText = GameState.inventory.length;
        
        invContainer.innerHTML = GameState.inventory.map(item => `
            <div class="craft-item" data-name="${item.name}" data-emoji="${item.emoji}" data-source="inventory">
                ${item.emoji} ${item.name}
            </div>
        `).join('');

        bindDragEvents(invContainer.querySelectorAll('.craft-item'));
    }

    function renderWorkspace() {
        const doc = getDoc();
        const wsContainer = doc.getElementById('craft-workspace');
        
        wsContainer.innerHTML = GameState.workspace.map(item => `
            <div class="craft-item" data-id="${item.id}" data-name="${item.name}" data-emoji="${item.emoji}" data-source="workspace"
                 style="position: absolute; left: ${item.x}px; top: ${item.y}px;">
                ${item.emoji} ${item.name}
            </div>
        `).join('');

        bindDragEvents(wsContainer.querySelectorAll('.craft-item'));
    }

    // ==================== HỆ THỐNG KÉO THẢ (DRAG & DROP) ====================
    function bindDragEvents(elements) {
        elements.forEach(el => {
            el.addEventListener('mousedown', handleDragStart, { passive: false });
            el.addEventListener('touchstart', handleDragStart, { passive: false });
        });
    }

    function handleDragStart(e) {
        if (e.target !== e.currentTarget) return; 
        const doc = getDoc();
        
        isDragging = true;
        const target = e.currentTarget;
        
        sourceArea = target.dataset.source;
        draggedData = {
            id: target.dataset.id,
            name: target.dataset.name,
            emoji: target.dataset.emoji
        };

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        if (sourceArea === 'inventory') {
            dragEl = target.cloneNode(true);
            dragEl.dataset.id = Date.now().toString() + '_' + Math.floor(Math.random() * 1000); 
            dragEl.dataset.source = 'workspace';
            doc.getElementById('craft-workspace').appendChild(dragEl);
            
            const rect = target.getBoundingClientRect();
            offsetX = rect.width / 2;
            offsetY = rect.height / 2;
        } 
        else {
            dragEl = target;
            const rect = dragEl.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            
            GameState.workspace = GameState.workspace.filter(i => i.id !== draggedData.id);
        }

        dragEl.classList.add('dragging');
        updateDragPosition(clientX, clientY);
    }

    function handleDragMove(e) {
        if (!isDragging || !dragEl) return;
        e.preventDefault(); 
        
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        updateDragPosition(clientX, clientY);
    }

    function updateDragPosition(clientX, clientY) {
        const doc = getDoc();
        const wsRect = doc.getElementById('craft-workspace').getBoundingClientRect();
        
        let x = clientX - wsRect.left - offsetX;
        let y = clientY - wsRect.top - offsetY;

        dragEl.style.left = `${x}px`;
        dragEl.style.top = `${y}px`;
    }

    function handleDragEnd(e) {
        if (!isDragging || !dragEl) return;
        
        const doc = getDoc();
        const wsRect = doc.getElementById('craft-workspace').getBoundingClientRect();
        const rect = dragEl.getBoundingClientRect();
        
        // 1. Nếu thả ra khỏi không gian bàn -> Xóa vật phẩm đó
        if (rect.bottom > wsRect.bottom) {
            dragEl.remove();
            saveGame();
            dragEl = null;
            isDragging = false;
            return;
        }

        // 2. Tắt chế độ "đang kéo" để khôi phục va chạm vật lý bình thường
        isDragging = false;
        dragEl.classList.remove('dragging');
        
        // VÁ LỖI TẠI ĐÂY: Ép cứng Position Absolute để thẻ bài không bị trôi sau khi tắt 'dragging'
        dragEl.style.position = 'absolute'; 

        const dropX = parseFloat(dragEl.style.left);
        const dropY = parseFloat(dragEl.style.top);

        // 3. KIỂM TRA VA CHẠM ĐỂ GHÉP ĐỒ
        let collisionTarget = null;
        const allWorkspaceItems = doc.getElementById('craft-workspace').querySelectorAll('.craft-item');
        
        for (let item of allWorkspaceItems) {
            // VÁ LỖI: Bỏ qua việc tự check va chạm với chính thẻ bài đang cầm
            if (item === dragEl) continue; 
            
            const itemRect = item.getBoundingClientRect();
            if (!(rect.right < itemRect.left || 
                  rect.left > itemRect.right || 
                  rect.bottom < itemRect.top || 
                  rect.top > itemRect.bottom)) {
                collisionTarget = item;
                break;
            }
        }

        if (collisionTarget) {
            // NẾU CÓ VA CHẠM -> CHUẨN BỊ GHÉP
            const item2Data = {
                id: collisionTarget.dataset.id,
                name: collisionTarget.dataset.name,
                emoji: collisionTarget.dataset.emoji
            };
            
            dragEl.remove();
            collisionTarget.remove();
            GameState.workspace = GameState.workspace.filter(i => i.id !== item2Data.id);
            
            // Tiến hành gọi AI ghép đồ
            mergeElements(draggedData, item2Data, dropX, dropY);
        } else {
            // KHÔNG VA CHẠM -> RỚT XUỐNG BÀN (LƯU TỌA ĐỘ)
            GameState.workspace.push({
                id: dragEl.dataset.id,
                name: dragEl.dataset.name,
                emoji: dragEl.dataset.emoji,
                x: dropX,
                y: dropY
            });
            
            // Gắn lại sự kiện mousedown cho cục vừa rớt (để kéo tiếp được)
            dragEl.addEventListener('mousedown', handleDragStart, { passive: false });
            dragEl.addEventListener('touchstart', handleDragStart, { passive: false });
        }

        saveGame();
        dragEl = null;
    }

    // ==================== LOGIC GỌI AI ĐỂ GHÉP ĐỒ ====================
    async function mergeElements(item1, item2, dropX, dropY) {
        const doc = getDoc();
        const loading = doc.getElementById('craft-loading');
        loading.classList.add('show');

        try {
            const PhoneSystem = window.parent.PhoneSystem;
            const settings = PhoneSystem.getSettings();
            if (!settings.apiConfig || !settings.apiConfig.apiKey) {
                throw new Error('Chưa cài đặt API Key trong Cài đặt điện thoại!');
            }

            const prompt = `You are the logic engine for an "Infinite Craft" game.
I am combining two elements. You must decide logically or creatively what they create.
Element 1: "${item1.emoji} ${item1.name}"
Element 2: "${item2.emoji} ${item2.name}"

Reply ONLY in JSON format: {"name": "Result Name", "emoji": "ResultEmoji"}
Rule 1: Translate the "name" to Vietnamese. Keep it short (1-3 words).
Rule 2: Use exactly ONE suitable emoji.
Rule 3: NO markdown, NO code blocks, ONLY valid JSON.`;

            console.log(`[Infinite Craft] Đang ghép: ${item1.name} + ${item2.name}`);

            const resultStr = await PhoneSystem.callExternalAPI([
                { role: 'user', content: prompt }
            ], { temperature: 0.7 });

            const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('AI không trả về JSON hợp lệ');

            const resultObj = JSON.parse(jsonMatch[0]);
            
            if (!resultObj.name || !resultObj.emoji) throw new Error('Thiếu trường dữ liệu');

            handleMergeSuccess(resultObj.name, resultObj.emoji, dropX, dropY);

        } catch (e) {
            console.error('[Infinite Craft] Lỗi ghép đồ:', e);
            alert("Lỗi ghép đồ: " + e.message);
            // Phục hồi lại 2 item nếu lỗi mạng
            GameState.workspace.push({ ...item1, x: dropX - 20, y: dropY });
            GameState.workspace.push({ ...item2, x: dropX + 20, y: dropY });
            renderWorkspace();
        } finally {
            loading.classList.remove('show');
            saveGame();
        }
    }

    function handleMergeSuccess(newName, newEmoji, x, y) {
        const doc = getDoc();
        const wsContainer = doc.getElementById('craft-workspace');

        const flash = doc.createElement('div');
        flash.className = 'craft-flash';
        flash.style.left = `${x + 30}px`; 
        flash.style.top = `${y + 15}px`;
        wsContainer.appendChild(flash);
        setTimeout(() => flash.remove(), 500);

        const isNew = !GameState.inventory.some(i => i.name.toLowerCase() === newName.toLowerCase());
        
        if (isNew) {
            GameState.inventory.push({ name: newName, emoji: newEmoji });
            renderInventory(); 
        }

        const newId = Date.now().toString() + '_' + Math.floor(Math.random() * 1000);
        GameState.workspace.push({ id: newId, name: newName, emoji: newEmoji, x: x, y: y });
        
        const el = doc.createElement('div');
        el.className = `craft-item ${isNew ? 'new-discovery' : ''}`;
        el.dataset.id = newId;
        el.dataset.name = newName;
        el.dataset.emoji = newEmoji;
        el.dataset.source = 'workspace';
        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.innerHTML = `${newEmoji} ${newName}`;
        
        el.addEventListener('mousedown', handleDragStart, { passive: false });
        el.addEventListener('touchstart', handleDragStart, { passive: false });
        
        wsContainer.appendChild(el);

        if (isNew) {
            setTimeout(() => el.classList.remove('new-discovery'), 2000);
        }
    }


    // ==================== KHỞI TẠO & ĐĂNG KÝ VÀO ĐIỆN THOẠI ====================
    async function openApp() {
        const phoneSystem = window.parent.PhoneSystem;
        if (!phoneSystem || !phoneSystem.iframeWindow) {
            setTimeout(openApp, 200);
            return;
        }

        const iframeDoc = phoneSystem.iframeWindow.document;
        currentIframeDoc = iframeDoc;

        const appContainer = iframeDoc.getElementById('app-container');
        if (!appContainer) return;

        iframeDoc.getElementById('home-screen').style.display = 'none';
        appContainer.innerHTML = '';
        appContainer.style.display = 'block';
        appContainer.style.pointerEvents = 'auto';

        let styleTag = iframeDoc.getElementById('craft-app-styles');
        if (!styleTag) {
            styleTag = iframeDoc.createElement('style');
            styleTag.id = 'craft-app-styles';
            iframeDoc.head.appendChild(styleTag);
        }
        styleTag.textContent = CRAFT_STYLES;

        const appDiv = iframeDoc.createElement('div');
        appDiv.id = 'craft-app-wrapper';
        appDiv.style.cssText = 'width:100%;height:100%;';
        appDiv.innerHTML = generateHTML();
        appContainer.appendChild(appDiv);

        iframeDoc.getElementById('btn-exit-app').addEventListener('click', () => {
            window.parent.PhoneSystem.goHome();
        });

        iframeDoc.getElementById('btn-continue-game').addEventListener('click', () => startGame(false));
        
        iframeDoc.getElementById('btn-new-game').addEventListener('click', () => {
            if (hasSavedGame()) {
                if(confirm("Tạo mới sẽ xóa toàn bộ túi đồ hiện tại. Bạn chắc chứ?")) startGame(true);
            } else {
                startGame(true);
            }
        });

        iframeDoc.getElementById('btn-clear-workspace').addEventListener('click', () => {
            GameState.workspace = [];
            saveGame();
            renderWorkspace();
        });

        iframeDoc.removeEventListener('mousemove', handleDragMove);
        iframeDoc.removeEventListener('touchmove', handleDragMove);
        iframeDoc.removeEventListener('mouseup', handleDragEnd);
        iframeDoc.removeEventListener('touchend', handleDragEnd);

        iframeDoc.addEventListener('mousemove', handleDragMove, { passive: false });
        iframeDoc.addEventListener('touchmove', handleDragMove, { passive: false });
        iframeDoc.addEventListener('mouseup', handleDragEnd);
        iframeDoc.addEventListener('touchend', handleDragEnd);

        updateMenuUI();
    }

    function closeApp() {
        if (!window.parent?.PhoneSystem?.iframeWindow) return;
        const iframeDoc = window.parent.PhoneSystem.iframeWindow.document;
        const appContainer = iframeDoc.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = '';
            appContainer.style.pointerEvents = 'none';
        }
        iframeDoc.getElementById('home-screen').style.display = 'block';
        
        iframeDoc.removeEventListener('mousemove', handleDragMove);
        iframeDoc.removeEventListener('touchmove', handleDragMove);
        iframeDoc.removeEventListener('mouseup', handleDragEnd);
        iframeDoc.removeEventListener('touchend', handleDragEnd);
        
        currentIframeDoc = null;
        isDragging = false;
        dragEl = null;
    }

    const check = setInterval(() => {
        if (window.parent && window.parent.PhoneSystem) {
            clearInterval(check);
            window.parent.PhoneSystem.registerApp({ 
                id: APP_ID, 
                name: APP_NAME, 
                icon: APP_ICON, 
                color: '#1a1a2e', 
                order: 9 
            });
            window.parent.PhoneSystem.on('app-opened', (data) => { if (data.id === APP_ID) openApp(); });
            window.parent.PhoneSystem.on('go-home', closeApp);
            console.log('✅ App Vô Cực Giới (Infinite Craft) đã được cập nhật lưu chung túi đồ toàn cục!');
        }
    }, 100);

})();