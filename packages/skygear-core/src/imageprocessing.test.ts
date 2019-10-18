import { ImageProcessingPipelineBuilder } from "./imageprocessing";

describe("ImageProcessingPipelineBuilder", () => {
  const f = () => new ImageProcessingPipelineBuilder();

  it("build format", () => {
    expect(
      f()
        .format("jpg")
        .getValue()
    ).toEqual("image/format,jpg");
    expect(
      f()
        .format("png")
        .getValue()
    ).toEqual("image/format,png");
    expect(
      f()
        .format("webp")
        .getValue()
    ).toEqual("image/format,webp");
  });

  it("build quality", () => {
    expect(
      f()
        .quality(1)
        .getValue()
    ).toEqual("image/quality,Q_1");
    expect(
      f()
        .quality(100)
        .getValue()
    ).toEqual("image/quality,Q_100");
  });

  it("build resize", () => {
    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .getValue()
    ).toEqual("image/resize,m_pad,l_3,s_4,w_1,h_2,color_556677");
  });

  it("build everything", () => {
    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .format("jpg")
        .quality(85)
        .getValue()
    ).toEqual(
      "image/resize,m_pad,l_3,s_4,w_1,h_2,color_556677/format,jpg/quality,Q_85"
    );
  });

  it("apply to an URL", () => {
    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .format("jpg")
        .quality(85)
        .setToURLString("http://example.com")
    ).toEqual(
      "http://example.com?pipeline=image%2Fresize%2Cm_pad%2Cl_3%2Cs_4%2Cw_1%2Ch_2%2Ccolor_556677%2Fformat%2Cjpg%2Fquality%2CQ_85"
    );

    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .format("jpg")
        .quality(85)
        .setToURLString("http://example.com/foo")
    ).toEqual(
      "http://example.com/foo?pipeline=image%2Fresize%2Cm_pad%2Cl_3%2Cs_4%2Cw_1%2Ch_2%2Ccolor_556677%2Fformat%2Cjpg%2Fquality%2CQ_85"
    );

    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .format("jpg")
        .quality(85)
        .setToURLString("http://example.com/foo?a=b")
    ).toEqual(
      "http://example.com/foo?a=b&pipeline=image%2Fresize%2Cm_pad%2Cl_3%2Cs_4%2Cw_1%2Ch_2%2Ccolor_556677%2Fformat%2Cjpg%2Fquality%2CQ_85"
    );

    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .format("jpg")
        .quality(85)
        .setToURLString("http://example.com#a")
    ).toEqual(
      "http://example.com?pipeline=image%2Fresize%2Cm_pad%2Cl_3%2Cs_4%2Cw_1%2Ch_2%2Ccolor_556677%2Fformat%2Cjpg%2Fquality%2CQ_85#a"
    );

    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .format("jpg")
        .quality(85)
        .setToURLString("http://example.com?a=b#a")
    ).toEqual(
      "http://example.com?a=b&pipeline=image%2Fresize%2Cm_pad%2Cl_3%2Cs_4%2Cw_1%2Ch_2%2Ccolor_556677%2Fformat%2Cjpg%2Fquality%2CQ_85#a"
    );

    expect(
      f()
        .resize({
          scalingMode: "pad",
          targetWidth: 1,
          targetHeight: 2,
          longerSide: 3,
          shorterSide: 4,
          color: "556677",
        })
        .format("jpg")
        .quality(85)
        .setToURLString("http://example.com?a=b&pipeline=c#a")
    ).toEqual(
      "http://example.com?a=b&pipeline=image%2Fresize%2Cm_pad%2Cl_3%2Cs_4%2Cw_1%2Ch_2%2Ccolor_556677%2Fformat%2Cjpg%2Fquality%2CQ_85#a"
    );
  });
});
