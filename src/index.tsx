import React from "react";
import { Upload, Icon, Modal } from "antd";
import interact from "interactjs";
import chili from "../../chili";

import "./index.scss";

async function customRequest(res: any) {
  // NOTE: 自定义图片上传方式
  const response = await chili("uploadProductPic", { img: res.file });
  res.onSuccess({
    thumbUrl: response.url,
    url: response.url
  });
}

function getBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

function dragMoveListener(event: any) {
  const { target } = event;
  // keep the dragged position in the data-x/data-y attributes
  const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  // translate the element
  target.style.webkitTransform = `translate(${x}px, ${y}px)`;
  target.style.transform = `translate(${x}px, ${y}px)`;

  // update the posiion attributes
  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);
}

// this is used later in the resizing and gesture demos
// @ts-ignore
window.dragMoveListener = dragMoveListener;

type UploadFileStatus = "error" | "success" | "done" | "uploading" | "removed";
interface UploadFile {
  uid: string;
  size: number;
  name: string;
  fileName?: string;
  lastModified?: number;
  lastModifiedDate?: Date;
  url?: string;
  status?: UploadFileStatus;
  percent?: number;
  thumbUrl?: string;
  originFileObj?: File;
  response?: any;
  error?: any;
  linkProps?: any;
  type: string;
}

interface Props {
  value?: any[];
  // defaultValue?: any[];
  /** @description 图片限制数量  */
  limit?: number;
  onChange: (fileList: any) => void;
}

interface State {
  previewVisible: boolean;
  previewImage: string;
  fileList: UploadFile[];
}

export default class InteractUpload extends React.Component<Props> {
  // NOTE: 默认限制上传图片 8张
  static defaultLimit = 8;

  static slider: any = null;

  state: State = {
    previewVisible: false,
    previewImage: "",
    fileList: []
  };

  componentDidMount() {
    this.setInteract();
  }

  componentWillUnmount() {
    // NOTE: 组件销毁是必须执行 unset() 函数，否则复用的 this 绑定是使用之前的 this 对象
    InteractUpload.slider.unset();
  }

  setInteract() {
    InteractUpload.slider = interact(
      ".interact_upload--box .ant-upload-list-item"
    ).draggable({
      inertia: true,
      onmove: dragMoveListener,
      // keep the element within the area of it's parent
      modifiers: [
        interact.modifiers.restrict({
          restriction: "parent",
          endOnly: true
        })
      ],
      // enable autoScroll
      onend: (event: any) => this.interactEnd(event)
    });
  }

  handleCancel = () => this.setState({ previewVisible: false });

  handlePreview = async (file: any) => {
    let preview = "";
    if (!file.url && !file.preview) {
      preview = await getBase64(file.originFileObj);
    }

    this.setState({
      previewImage: file.url || preview,
      previewVisible: true
    });
  };

  // NOTE: 这里处理上报到上层
  handleChange = ({ fileList }: any) => {
    const { onChange } = this.props;
    onChange(fileList);
    this.setState({ fileList });
  };

  interactEnd(event: any) {
    const { target } = event;
    const x = target.getAttribute("data-x");
    const y = target.getAttribute("data-y");
    // NOTE: translate 不会影响 offsetLeft ，所以需要手动计算真实的 offsetLeft ...
    const realOffsetLeft = parseInt(x, 10) + target.offsetLeft;
    const realOffsetTop = parseInt(y, 10) + target.offsetTop;
    const targets = document.querySelectorAll(
      ".cus_upload--box .ant-upload-list-item"
    );
    let moveIndex = -1;
    let replaceIndex = -1;
    // NOTE: HTMLCollectionOf 不能使用 forEach 之类的迭代器函数
    for (let i = 0; i < targets.length; i += 1) {
      const element = targets[i] as HTMLElement;
      const tx = element.getAttribute("data-x");
      const ty = element.getAttribute("data-y");
      if (x === tx && y === ty) {
        moveIndex = i;
      } else if (
        Math.abs(realOffsetLeft - element.offsetLeft) < target.offsetWidth &&
        Math.abs(realOffsetTop - element.offsetTop) < target.offsetHeight
      ) {
        // NOTE: 碰撞检测
        replaceIndex = i;
      }
    }
    if (replaceIndex !== -1) {
      // NOTE: 移动数组位置即可，按顺序上传图片，即为显示顺序
      // console.log("然后换位置", moveIndex, replaceIndex);
      const { fileList } = this.state;
      // console.log("this 绑定值不对", this.state);
      [fileList[replaceIndex], fileList[moveIndex]] = [
        fileList[moveIndex],
        fileList[replaceIndex]
      ];
      // NOTE: 这里也需要上报到上层组件
      const { onChange } = this.props;
      onChange(fileList);
      this.setState({
        fileList
      });
    }
    target.style.webkitTransform = `translate(0px, 0px)`;
    target.style.transform = `translate(0px, 0px)`;
    target.setAttribute("data-x", 0);
    target.setAttribute("data-y", 0);
  }

  render() {
    const { previewVisible, previewImage, fileList } = this.state;
    const { limit,value, ...others } = this.props;
    const uploadButton = (
      <div>
        <Icon type="plus" />
        <div className="ant-upload-text">上传</div>
      </div>
    );
    const limitLen = limit || InteractUpload.defaultLimit;
    // console.log("检查下", fileList);
    const fileArr = fileList.length === 0 && value ? value : fileList;

    return (
      <div className="clearfix cus_upload--box">
        <Upload
          {...others}
          listType="picture-card"
          fileList={fileArr}
          onPreview={this.handlePreview}
          onChange={this.handleChange}
          customRequest={customRequest}
        >
          {fileArr.length >= limitLen ? null : uploadButton}
        </Upload>
        <Modal
          visible={previewVisible}
          footer={null}
          onCancel={this.handleCancel}
        >
          <img alt="example" style={{ width: "100%" }} src={previewImage} />
        </Modal>
      </div>
    );
  }
}
